import Head from 'next/head'
import Header from "@/components/layout/Header";
import Footer from '@/components/layout/Footer'
import JumiaProductsDisplay from '@/components/product/JumiaProductsDisplay'

export default function ShopPage() {
  return (
    <>
      <Head>
        <title>Shop - RenewableZmart</title>
        <meta name="description" content="Browse and shop products from RenewableZmart" />
      </Head>

      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <JumiaProductsDisplay />
      </main>
      <Footer />
    </>
  )
}



