import React, { useState } from 'react';
import { Layout, Menu, theme, Upload, message, Button, Input } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import './App.css';

const { Header, Content, Footer, Sider } = Layout;

const App = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const props = {
    name: 'csvFile',
    action: 'http://localhost:3001/upload', // Backend upload endpoint
    headers: {
      authorization: 'authorization-text',
    },
    onChange(info) {
      if (info.file.status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="demo-logo-vertical" />
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
          <Menu.Item key="1" icon={<UploadOutlined />}>
            文件上传
          </Menu.Item>
          {/* Add more menu items for other features */}
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer }} />
        <Content style={{ margin: '0 16px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <h1>SLS Log Analyzer - 文件上传</h1>
            <Upload {...props}>
              <Button icon={<UploadOutlined />}>点击或拖拽上传 CSV 文件</Button>
            </Upload>

            {/* Placeholder for history sessions */}
            <div style={{ marginTop: '20px' }}>
              <h2>历史会话</h2>
              <Input.Search
                placeholder="搜索会话ID或玩家ID"
                enterButton="搜索"
                size="large"
                onSearch={(value) => console.log(value)}
                style={{ width: 300 }}
              />
              {/* Display historical sessions here */}
              <p>暂无历史会话数据</p>
            </div>
          </div>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          SLS Log Analyzer ©2026 Created by OpenClaw
        </Footer>
      </Layout>
    </Layout>
  );
};

export default App;
