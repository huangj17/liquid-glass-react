import TabComponent from "./TabComponent";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          React 液态玻璃组件示例
        </h1>
        <TabComponent />
      </div>
    </div>
  );
}

export default App;
