import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DockerRunOptions {
  image: string;
  containerName: string;
  memory: string;
  cpus: string;
  network?: string;
  volumes?: string[]; // Format: 'host_path:container_path:ro'
  command: string;
}

export interface DockerResult {
  stdout: string;
  stderr: string;
}

export async function runDockerContainer(options: DockerRunOptions): Promise<DockerResult> {
  const { image, containerName, memory, cpus, network = 'none', volumes = [], command } = options;

  const volumeArgs = volumes.map(v => `-v ${v}`).join(' ');
  const cmd = `docker run --rm --name ${containerName} --memory ${memory} --cpus ${cpus} --network ${network} ${volumeArgs} ${image} ${command}`;

  try {
    const { stdout, stderr } = await execAsync(cmd);
    return { stdout, stderr };
  } catch (err: any) {
    // If the process exits with a non-zero code, exec throws an Error which contains stdout/stderr
    throw {
      message: err.message,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      code: err.code,
    };
  }
}

export async function killDockerContainer(containerName: string): Promise<void> {
  try {
    await execAsync(`docker kill ${containerName}`);
  } catch (err) {
    // Ignore errors if the container is already dead or doesn't exist
    // console.log(`[docker] kill ${containerName} failed/ignored:`, err.message);
  }
}
