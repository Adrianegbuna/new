import Head from 'next/head';
import Header from '@/components/layout/Header';
import { ProtectAdminPage } from '@/components/services-requests/ProtectAdminPage';
import { AdminServiceRequests } from "@/components/services-requests/AdminServiceRequests";

export default function AdminCustomerSupportPage() {
  return (
    <ProtectAdminPage requiredRole="admin">
      <Head>
        <title>Customer Support - Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <AdminServiceRequests />
        </main>
      </div>
    </ProtectAdminPage>
  );
}


