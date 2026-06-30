import Head from 'next/head';
import Header from '@/components/Header';
import { ProtectAdminPage } from '@/components/ProtectAdminPage';
import { AdminChatInbox } from '@/components/AdminChatInbox';

export default function AdminChatPage() {
  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Chat Inbox - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <AdminChatInbox />
        </main>
      </div>
    </ProtectAdminPage>
  );
}
