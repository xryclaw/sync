import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import UploadPage from './pages/UploadPage';
import LogsPage from './pages/LogsPage';
import './App.css';

const { Header, Content } = Layout;

function App() {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginRight: '50px' }}>
            SLS 日志分析平台
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            defaultSelectedKeys={['upload']}
            items={[
              {
                key: 'upload',
                icon: <UploadOutlined />,
                label: <Link to="/">上传</Link>,
              },
              {
                key: 'logs',
                icon: <FileTextOutlined />,
                label: <Link to="/logs">日志查看</Link>,
              },
            ]}
          />
        </Header>
        <Content>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Routes>
        </Content>
      </Layout>
    </Router>
  );
}

export default App;
