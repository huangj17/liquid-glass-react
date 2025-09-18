import React, { memo, useCallback, useEffect, useRef } from "react";
import "./index.css";

// 二维向量接口
interface Vec2 {
  x: number;
  y: number;
}

// 纹理坐标接口
interface TextureCoord {
  type: "t";
  x: number;
  y: number;
}

// 组件属性接口
interface LiquidGlassProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  className?: string;
  style?: React.CSSProperties;
  onMouseDown?: () => void;
  onMouseMove?: () => void;
  onMouseUp?: () => void;
  position?: {
    x: number;
    y: number;
  };
}

// 平滑插值函数，常用于边缘羽化
const smoothStep = (a: number, b: number, t: number): number => {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// 计算二维向量长度
const length = (x: number, y: number): number => Math.sqrt(x * x + y * y);

// 计算圆角矩形的SDF（有符号距离函数），用于形状羽化
const roundedRectSDF = (
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): number => {
  const qx = Math.abs(x) - width + radius;
  const qy = Math.abs(y) - height + radius;
  // SDF公式，返回点到圆角矩形边界的距离
  return (
    Math.min(Math.max(qx, qy), 0) +
    length(Math.max(qx, 0), Math.max(qy, 0)) -
    radius
  );
};

// 生成纹理坐标对象
const texture = (x: number, y: number): TextureCoord => ({
  type: "t" as const,
  x,
  y,
});

// 生成唯一ID，用于SVG filter等
const generateId = (): string =>
  "liquid-glass-" + Math.random().toString(36).substring(2, 11);

// 主组件
const LiquidGlass: React.FC<LiquidGlassProps> = ({
  width = 300,
  height = 200,
  borderRadius = 150,
  className,
  style,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  position = { x: 0, y: 0 },
}) => {
  // 生成唯一ID，保证SVG filter唯一
  const idRef = useRef<string>(generateId());
  // 容器div引用
  const containerRef = useRef<HTMLDivElement | null>(null);
  // SVG feImage节点引用
  const feImageRef = useRef<SVGFEImageElement | null>(null);
  // SVG feDisplacementMap节点引用
  const feDispRef = useRef<SVGFEDisplacementMapElement | null>(null);
  // 隐藏canvas引用
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // canvas上下文引用
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // 屏幕像素比，后续可支持高DPI
  const dpi = 1;

  // 片元着色器函数，计算每个像素的位移
  const fragment = useCallback((uv: Vec2): TextureCoord => {
    // 毛边/边缘羽化主要由以下三处控制：
    // 1) 这里的 SDF 距离与 smoothStep 阈值：越靠近 0 过渡越陡，边缘越硬；阈值差越大，边越“毛”。
    //    - 第一个 smoothStep(0.8, 0, ...) 控制整体形状边缘的羽化范围
    //    - 第二个 smoothStep(0, 1, displacement) 控制位移强度的再映射（影响位移的扩散）
    // 2) 容器样式中的 backdropFilter 的 blur(px)（见下方 style 内），blur 越大越“毛玻璃”。
    // 3) SVG feDisplacementMap 的 scale（见 updateDisplacementMap 末尾 setAttribute），越大越扭曲/边缘更糊。
    const ix = uv.x - 0.5;
    const iy = uv.y - 0.5;
    // 计算当前点到圆角矩形边界的距离
    const distanceToEdge = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
    // TODO: 调大 0.8→0.9 或调小 -0.15 的绝对值，可让羽化范围更宽（边更“毛”）
    // 通过smoothStep实现边缘羽化
    const displacement = smoothStep(0.8, 0, distanceToEdge - 0.15);
    // 再次平滑映射，控制位移强度
    const scaled = smoothStep(0, 1, displacement);
    // 返回新的纹理坐标
    return texture(ix * scaled + 0.5, iy * scaled + 0.5);
  }, []);

  // 更新位移图（displacement map），核心算法
  const updateDisplacementMap = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const feImage = feImageRef.current;
    const feDisp = feDispRef.current;
    // 关键节点未挂载时直接返回
    if (!canvas || !ctx || !feImage || !feDisp) return;

    // 计算canvas尺寸
    const w = Math.max(1, Math.floor(width * dpi));
    const h = Math.max(1, Math.floor(height * dpi));
    // 若尺寸变化则重设canvas
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;

    // 创建像素数据
    const data = new Uint8ClampedArray(w * h * 4);
    let maxScale = 0;
    const raw: number[] = [];

    // 遍历每个像素，计算位移
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % w;
      const y = Math.floor(i / 4 / w);
      // 归一化坐标
      const pos = fragment({ x: x / w, y: y / h });
      // 计算位移量
      const dx = pos.x * w - x;
      const dy = pos.y * h - y;
      // 记录最大位移，用于归一化
      maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy));
      raw.push(dx, dy);
    }

    // 防止maxScale为0，至少为1
    maxScale = Math.max(1, maxScale * 0.5);

    // 写入像素数据，R/G通道分别存储X/Y位移
    let index = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = raw[index++] / maxScale + 0.5;
      const g = raw[index++] / maxScale + 0.5;
      data[i] = Math.max(0, Math.min(255, Math.round(r * 255)));
      data[i + 1] = Math.max(0, Math.min(255, Math.round(g * 255)));
      data[i + 2] = 0;
      data[i + 3] = 255;
    }

    // 将像素数据写入canvas
    ctx.putImageData(new ImageData(data, w, h), 0, 0);
    // xlink:href 写入 dataURL
    feImage.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "href",
      canvas.toDataURL()
    );
    // 位移强度：越大越“糊/扭曲”，边缘毛边感更明显。可乘以系数增强，例如 (maxScale / dpi) * 1.2
    feDisp.setAttribute("scale", (maxScale / dpi).toString());
  }, [width, height, fragment]);

  // 初始化 canvas ctx，只执行一次
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) ctxRef.current = ctx;
  }, []);

  // 首次与尺寸变化时更新位移图
  useEffect(() => {
    updateDisplacementMap();
  }, [width, height, updateDisplacementMap]);

  // SVG filter和map的唯一ID
  const filterId = idRef.current + "_filter";
  const mapId = idRef.current + "_map";

  return (
    <>
      {/* SVG定义滤镜，包含feImage和feDisplacementMap */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="0"
        height="0"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          //   zIndex: 9998,
        }}
      >
        <defs>
          <filter
            id={filterId}
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
            x="0"
            y="0"
            width={width}
            height={height}
          >
            {/* feImage用于加载位移图 */}
            <feImage
              ref={feImageRef}
              id={mapId}
              width={width}
              height={height}
            />
            {/* feDisplacementMap实现毛玻璃扭曲效果 */}
            <feDisplacementMap
              ref={feDispRef}
              in="SourceGraphic"
              in2={mapId}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
      {/* 隐藏canvas用于生成位移图 */}
      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
        width={Math.max(1, Math.floor(width * dpi))}
        height={Math.max(1, Math.floor(height * dpi))}
      />
      {/* 毛玻璃主容器 */}
      <div
        ref={containerRef}
        className={`liquid-glass-controls ${className || ""}`}
        style={{
          position: "relative",
          top: position.y,
          left: position.x,
          width,
          height,
          overflow: "hidden",
          borderRadius,
          boxShadow:
            "0 2px 4px rgba(0, 0, 0, 0.18), 0 -4px 10px inset rgba(0, 0, 0, 0.10)",
          // 毛玻璃强度：主要由 blur(px) 决定。0.25px 很弱；可尝试 4px~12px。
          // blur 毛玻璃 contrast 对比度 brightness 亮度 saturate 饱和度
          backdropFilter: `url(#${filterId}) blur(0.25px) contrast(1.2) brightness(1.05) saturate(1.1)`,
          //   zIndex: 9999,
          pointerEvents: "auto",
          //   transition: 'all 0.3s ease-in-out',
          ...(style || {}),
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
    </>
  );
};

// 动画组件属性接口
interface LiquidGlassAnimationProps extends LiquidGlassProps {
  translateX?: number;
}

// 动画组件，支持X方向平滑移动和动画效果
const LiquidGlassAnimation = memo(
  ({ translateX = 0, ...props }: LiquidGlassAnimationProps) => {
    // 用 key 让内层在每次 translateX 变化时重建以触发一次动画
    const jellyKey = `${translateX}-${props.height}`;

    return (
      <div
        className="absolute z-1 translate-smooth"
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        <div
          key={jellyKey}
          className="animate-jelly"
          style={{
            transformOrigin: "center center",
            position: "relative",
          }}
        >
          {/* 渲染毛玻璃主组件 */}
          <LiquidGlass {...props} />
        </div>
      </div>
    );
  }
);

LiquidGlassAnimation.displayName = "LiquidGlassAnimation";

// 导出动画组件和主组件
export { LiquidGlassAnimation };
export default LiquidGlass;
