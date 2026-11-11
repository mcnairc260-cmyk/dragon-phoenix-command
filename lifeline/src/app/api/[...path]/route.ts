import { handleApi } from '@/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export { handleApi as GET, handleApi as POST, handleApi as PUT, handleApi as DELETE };
