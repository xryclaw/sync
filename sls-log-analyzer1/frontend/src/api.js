import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 上传 CSV 文件
export const uploadCSV = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// 获取上传会话列表
export const getSessions = () => {
  return api.get('/upload/sessions');
};

// 查询日志列表
export const getLogs = (params) => {
  return api.get('/logs', { params });
};

// 获取日志详情
export const getLogDetail = (id) => {
  return api.get(`/logs/${id}`);
};

export default api;
