export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: Date;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  participants: string[];
}
