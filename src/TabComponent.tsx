import { useEffect, useRef, useState } from "react";
import background from "./assets/bg.jpeg";
import LiquidGlass, { LiquidGlassAnimation } from "./components/LiquidGlass";

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

const tabs: TabItem[] = [
  {
    id: "tab1",
    label: "首页",
    content: (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">欢迎来到首页</h2>
        <p className="text-gray-600 leading-relaxed">
          这是第一个标签页的内容。你可以在这里放置任何你想要的内容，包括文本、图片、表单等。
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800">
            💡 提示：点击不同的标签页来查看不同的内容！
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "tab2",
    label: "产品",
    content: (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">我们的产品</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h3 className="font-semibold text-lg mb-2">产品 A</h3>
            <p className="text-gray-600 text-sm">这是产品A的详细描述</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h3 className="font-semibold text-lg mb-2">产品 B</h3>
            <p className="text-gray-600 text-sm">这是产品B的详细描述</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md border">
            <h3 className="font-semibold text-lg mb-2">产品 C</h3>
            <p className="text-gray-600 text-sm">这是产品C的详细描述</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "tab3",
    label: "关于",
    content: (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">关于我们</h2>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg text-purple-800 mb-2">
              我们的使命
            </h3>
            <p className="text-purple-700">为用户提供最优质的产品和服务体验</p>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg text-orange-800 mb-2">
              联系方式
            </h3>
            <p className="text-orange-700">
              📧 contact@example.com | 📞 +86 123-4567-8900
            </p>
          </div>
        </div>
      </div>
    ),
  },
];

const TabComponent = () => {
  const [activeTab, setActiveTab] = useState("tab1");
  const [activeTabOffset, setActiveTabOffset] = useState(0);
  const [liquidGlassPosition, setLiquidGlassPosition] = useState({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  // 拖拽相关引用：
  // startPosRef: 记录“按下瞬间”的鼠标坐标，用来计算 deltaX/deltaY
  // initialPosRef: 记录“按下瞬间”的组件位置，新的位置 = initial + delta
  // mousePosRef: 最新的全局鼠标坐标（因为内部回调无事件参数）
  const startPosRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });

  // 初始化鼠标位置跟踪：在用户第一次点击之前，提前填充 mousePosRef，
  // 避免初始为 {0,0} 导致第一次按下时出现“瞬移”到右下角的问题。
  useEffect(() => {
    const handleInitialMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    document.addEventListener("mousemove", handleInitialMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleInitialMouseMove);
    };
  }, []);

  const handleTabClick = (tabId: string, index: number) => {
    setActiveTab(tabId);
    setActiveTabOffset(index * 60);
  };

  // 全局鼠标事件监听器：
  // 说明：LiquidGlass 的回调不带事件对象，为获取坐标且保证拖出组件仍可拖动，
  // 将监听绑定到 document。
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      if (isDragging) {
        // 基于“按下时”的鼠标坐标计算相对位移
        const deltaX = e.clientX - startPosRef.current.x;
        const deltaY = e.clientY - startPosRef.current.y;
        // 新位置 = “按下时组件位置” + 相对位移
        const newPos = {
          x: initialPosRef.current.x + deltaX,
          y: initialPosRef.current.y + deltaY,
        };

        setLiquidGlassPosition(newPos);
      }
    };

    const handleGlobalMouseUp = () => {
      // 鼠标在任意位置释放都结束拖拽
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isDragging]);

  const handleMouseUp = () => {
    // 组件内部抬起也要结束拖拽，与全局监听互为兜底
    setIsDragging(false);
  };

  const handleMouseDown = () => {
    // 开始拖拽：
    // 1) 以当前鼠标坐标作为起点（startPosRef）
    // 2) 以当前组件坐标作为基准（initialPosRef），后续叠加相对位移
    setIsDragging(true);
    // 使用当前鼠标位置作为起始位置
    startPosRef.current = { ...mousePosRef.current };
    // 保持当前位置作为初始位置
    initialPosRef.current = { ...liquidGlassPosition };
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 bg-white/50 rounded-lg p-4">
      {/* Tab 导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex relative">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, index)}
              style={{ flex: "0 0 60px" }}
              className={`
                py-2 px-1 font-medium text-sm transition-all duration-300 rounded-[18px]
                relative z-1
              `}
            >
              {tab.label}
            </button>
          ))}
          <LiquidGlassAnimation
            width={60}
            height={38}
            borderRadius={18}
            translateX={activeTabOffset}
          />
        </nav>
      </div>

      {/* Tab 内容 */}
      <div className="mt-0">
        {tabs.find((tab) => tab.id === activeTab)?.content}
      </div>

      <div className="absolute top-0 left-0">
        <LiquidGlass
          // 注意：这些回调不带事件对象，坐标来自上面的 document 级监听
          onMouseUp={handleMouseUp}
          onMouseDown={handleMouseDown}
          position={liquidGlassPosition}
        />
      </div>
      <div className="mt-10 w-full h-[300px] mx-auto">
        <img src={background} alt="" />
      </div>
    </div>
  );
};

export default TabComponent;
