export const SANDBOX_CONFIG = {
  
  // Resource limits
  MEMORY_LIMIT: '256m',
  CPUS: '0.5',
  
  // Execution constraints
  TIMEOUT_MS: 5000,
  
  // Workspace paths
  BASE_WORKSPACE_DIR: '/tmp/codeforge-sandbox',
} as const;
