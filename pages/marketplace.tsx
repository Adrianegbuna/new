import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import RenewableEnergyMarketplace from '../components/RenewableEnergyMarketplace'

export default function MarketplacePage() {
  return (
    <>
      <Head>
        <title>RenewableZmart - Renewable Energy Marketplace</title>
        <meta name="description" content="Browse and shop renewable energy products, solar panels, wind turbines, EV parts, and more" />
      </Head>

      <Header />
      <main className="min-h-screen bg-gray-50">
        {/* Renewable Energy Marketplace with 9 categories and 47 subcategories */}
        <RenewableEnergyMarketplace />
      </main>
      <Footer />
    </>
  )
}



