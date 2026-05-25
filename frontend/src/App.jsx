import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, 
  History, 
  Settings, 
  BarChart3, 
  Shield, 
  Zap, 
  Download, 
  Clock,
  Trash2,
  Plus,
  RefreshCw,
  Server,
  Activity,
  Award
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

const API_BASE = '/api';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [history, setHistory] = useState([]);
  const [premiumIPs, setPremiumIPs] = useState([]);
  const [selectedIPLogs, setSelectedIPLogs] = useState([]);
  const [selectedIP, setSelectedIP] = useState(null);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [params, setParams] = useState({
    routines: 200,
    ping_times: 4,
    test_count: 10,
    download_time: 10,
    tcp_port: 443,
    url: 'https://cf.xiu2.xyz/url',
    httping: false,
    max_delay: 9999,
    min_speed: 0,
    source_addr: ''
  });

  const [newTask, setNewTask] = useState({
    cron: '0 * * * *',
    params: { ...params }
  });

  useEffect(() => {
    fetchHistory();
    fetchTasks();
    fetchPremiumIPs();
  }, []);

  const fetchPremiumIPs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/premium`);
      setPremiumIPs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch premium IPs', err);
    }
  };

  const fetchIPLogs = async (ip) => {
    try {
      const res = await axios.get(`${API_BASE}/premium/logs?ip=${ip}`);
      setSelectedIPLogs(res.data || []);
      setSelectedIP(ip);
    } catch (err) {
      console.error('Failed to fetch IP logs', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/history`);
      setHistory(res.data || []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tasks`);
      setTasks(res.data || {});
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      await axios.post(`${API_BASE}/test`, params);
      fetchHistory();
    } catch (err) {
      alert('Test failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setTesting(false);
    }
  };

  const addTask = async () => {
    try {
      await axios.post(`${API_BASE}/tasks`, newTask);
      fetchTasks();
      alert('Task added successfully');
    } catch (err) {
      alert('Failed to add task: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteTask = async (cron) => {
    try {
      await axios.delete(`${API_BASE}/tasks?cron=${encodeURIComponent(cron)}`);
      fetchTasks();
    } catch (err) {
      alert('Failed to delete task');
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Premium IPs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Award size={20} className="text-yellow-500" />
              优质 IP 监测池
            </h3>
            <button onClick={fetchPremiumIPs} className="text-gray-400 hover:text-blue-600 transition-colors">
              <RefreshCw size={18} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-6 py-3">IP</th>
                  <th className="px-6 py-3">平均延迟</th>
                  <th className="px-6 py-3">速度</th>
                  <th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {premiumIPs.map((ip, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => fetchIPLogs(ip.ip)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedIP === ip.ip ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 text-sm font-medium">{ip.ip}</td>
                    <td className="px-6 py-4 text-sm">{ip.avg_delay.toFixed(1)} ms</td>
                    <td className="px-6 py-4 text-sm">{ip.download_speed.toFixed(1)} MB/s</td>
                    <td className="px-6 py-4">
                      <Activity size={16} className="text-blue-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-blue-500" />
            {selectedIP ? `${selectedIP} 延迟历史` : '点击 IP 查看详细监测'}
          </h3>
          <div className="h-[300px]">
            {selectedIP ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[...selectedIPLogs].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="created_at" 
                    tickFormatter={(val) => new Date(val).toLocaleTimeString()} 
                    fontSize={10}
                  />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="delay" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="延迟 (ms)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">
                请在左侧选择一个优质 IP 以查看 SmokePing 风格图表
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Zap size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">最近平均延迟</p>
              <p className="text-2xl font-bold">{history.length > 0 ? (history.reduce((a, b) => a + b.delay, 0) / history.length).toFixed(1) : 0} ms</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <Download size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">最近平均速度</p>
              <p className="text-2xl font-bold">{history.length > 0 ? (history.reduce((a, b) => a + b.download_speed, 0) / history.length).toFixed(2) : 0} MB/s</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">总测试次数</p>
              <p className="text-2xl font-bold">{history.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <BarChart3 size={20} className="text-gray-400" />
          测速趋势
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[...history].reverse()}>
              <defs>
                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="created_at" 
                tickFormatter={(val) => new Date(val).toLocaleTimeString()} 
                stroke="#9ca3af"
                fontSize={12}
              />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="download_speed" stroke="#10b981" fillOpacity={1} fill="url(#colorSpeed)" name="下载速度 (MB/s)" />
              <Area type="monotone" dataKey="delay" stroke="#3b82f6" fillOpacity={0} name="延迟 (ms)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold">最近测试结果</h3>
          <button 
            onClick={runTest}
            disabled={testing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              testing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
            }`}
          >
            {testing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
            {testing ? '测试中...' : '立即测试'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">时间</th>
                <th className="px-6 py-4 font-semibold">IP</th>
                <th className="px-6 py-4 font-semibold">延迟</th>
                <th className="px-6 py-4 font-semibold">丢包</th>
                <th className="px-6 py-4 font-semibold">速度</th>
                <th className="px-6 py-4 font-semibold">地区</th>
                <th className="px-6 py-4 font-semibold">网卡</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 font-medium">{item.ip}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {item.delay.toFixed(1)} ms
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{(item.loss_rate * 100).toFixed(0)}%</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                      {item.download_speed.toFixed(2)} MB/s
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.colo}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.source_addr || '默认'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Settings size={22} className="text-gray-400" />
          测试参数设置
        </h3>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">延迟线程 (n)</label>
              <input 
                type="number" 
                value={params.routines} 
                onChange={e => setParams({...params, routines: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">测速数量 (dn)</label>
              <input 
                type="number" 
                value={params.test_count} 
                onChange={e => setParams({...params, test_count: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">测速时间 (dt)</label>
              <input 
                type="number" 
                value={params.download_time} 
                onChange={e => setParams({...params, download_time: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">延迟上限 (tl)</label>
              <input 
                type="number" 
                value={params.max_delay} 
                onChange={e => setParams({...params, max_delay: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">指定本地网卡 IP (source)</label>
            <div className="relative">
              <Server size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={params.source_addr} 
                placeholder="例如: 192.168.1.10"
                onChange={e => setParams({...params, source_addr: e.target.value})}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">在 Docker Macvlan 模式下可指定网卡 IP 进行测速</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">测速地址 (url)</label>
            <input 
              type="text" 
              value={params.url} 
              onChange={e => setParams({...params, url: e.target.value})}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <input 
              type="checkbox" 
              checked={params.httping} 
              id="httping"
              onChange={e => setParams({...params, httping: e.target.checked})}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="httping" className="text-sm font-bold text-gray-700 cursor-pointer select-none">使用 HTTPing 模式</label>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <Clock size={22} className="text-gray-400" />
          定时任务
        </h3>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cron 表达式</label>
              <input 
                type="text" 
                value={newTask.cron} 
                placeholder="例如: 0 * * * * (每小时)"
                onChange={e => setNewTask({...newTask, cron: e.target.value})}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-end">
              <button 
                onClick={addTask}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">已启用任务</label>
            {Object.keys(tasks).length === 0 ? (
              <p className="text-sm text-gray-400 italic">暂无定时任务</p>
            ) : (
              Object.entries(tasks).map(([cron, p], idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 group">
                  <div>
                    <p className="font-mono text-sm font-bold text-blue-600">{cron}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      网卡: {p.source_addr || '默认'} | 数量: {p.test_count} | 线程: {p.routines}
                    </p>
                  </div>
                  <button 
                    onClick={() => deleteTask(cron)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-100 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Zap size={24} />
          </div>
          <h1 className="text-xl font-black tracking-tight">CFST <span className="text-blue-600">Web</span></h1>
        </div>
        
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={20} />
            仪表盘
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'settings' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Settings size={20} />
            配置中心
          </button>
        </nav>

        <div className="mt-auto p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2">
            <Shield size={14} />
            SYSTEM STATUS
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-gray-600">Backend Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' ? renderDashboard() : renderSettings()}
      </main>
    </div>
  );
}

export default App;
