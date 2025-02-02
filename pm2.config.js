module.exports = {
  apps: [
    {
      name: 'api_llm_integration_service:5511',
      script: 'npm',
      args: 'start',
      cwd: '/home/fuse_admin/repos_chat/api_llm_integration_service',
      env: {
        NODE_ENV: 'production',
        PORT: 5511,
      },
    },
  ],
};
