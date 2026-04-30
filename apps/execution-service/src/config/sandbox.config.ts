export const SANDBOX_CONFIG = {
  // Base image to use for the sandbox. We'll use alpine for foundational testing.
  BASE_IMAGE: 'node:18-alpine',
  
  // Resource limits
  MEMORY_LIMIT: '256m',
  CPUS: '0.5',
  
  // Execution constraints
  TIMEOUT_MS: 5000,
  
  // Workspace paths
  BASE_WORKSPACE_DIR: '/tmp/codeforge-sandbox',
} as const;
