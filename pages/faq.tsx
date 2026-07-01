import Head from 'next/head'
import Header from "@/components/layout/Header";
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const faqSections = [
  {
    id: 'general',
    title: 'General Platform Questions',
    items: [
      {
        q: 'What is RenewableZmart?',
        a: 'RenewableZmart.com is a digital market website that connects customers with renewable energy products, certified installers, and service providers. The platform allows individuals and businesses to purchase renewable energy equipment, compare solutions, access services, and finance renewable energy systems.'
      },
      {
        q: 'Who can use RenewableZmart?',
        a: 'The platform serves multiple user groups including homeowners, businesses, installers, dealers, manufacturers, and renewable energy service providers.'
      },
      {
        q: 'What types of products are available?',
        a: 'Typical product categories include solar panels, inverters, batteries, solar accessories, energy storage equipment, and related renewable energy technologies.'
      },
      {
        q: 'Is RenewableZmart only for solar energy?',
        a: 'While solar appears to be the main focus, the platform may also support other renewable technologies such as wind or hybrid energy systems depending on vendor offerings.'
      },
      {
        q: 'Which countries does RenewableZmart serve?',
        a: 'The platform focuses on renewable energy adoption in Africa and emerging markets.'
      }
    ]
  },
  {
    id: 'account',
    title: 'Account and Registration',
    items: [
      {
        q: 'Do I need an account to use RenewableZmart?',
        a: 'Basic browsing may be possible without an account, but purchasing products, requesting services, or accessing financing requires registration.'
      },
      {
        q: 'How do I create an account?',
        a: 'Click the Register option on the platform and provide the required information.'
      },
      {
        q: 'Can I register as a business or installer?',
        a: 'Yes. Electric Vehicle & Parts Stores, businesses, dealers, and installers may create specialized accounts to sell products or offer services.'
      },
      {
        q: 'How do I reset my password?',
        a: 'Use the "Forgot Password" option on the login page and follow the password recovery instructions.'
      }
    ]
  },
  {
    id: 'marketplace',
    title: 'Marketplace and Products',
    items: [
      {
        q: 'How do I search for renewable energy products?',
        a: 'Use the search bar or browse through stores and services on the platform.'
      },
      {
        q: 'How do I compare products?',
        a: 'Product listings on vendor stores allow users to review specifications, pricing, and performance ratings before making a purchase.'
      },
      {
        q: 'Are the products certified?',
        a: 'Products sold on the platform are tested and sourced from trusted manufacturers to ensure quality and reliability.'
      },
      {
        q: 'Can I purchase directly from dealers?',
        a: 'Yes. The platform includes R E stores where verified sellers list renewable energy equipment.'
      },
      {
        q: 'What payment methods are accepted?',
        a: 'Payment options may include online card payments, bank transfers, and installment financing options.'
      }
    ]
  },
  {
    id: 'stores',
    title: 'Stores',
    items: [
      {
        q: 'What are Stores?',
        a: 'Stores are vendor and dealer pages where renewable energy suppliers list and sell products directly to customers.'
      },
      {
        q: 'How do I become a vendor or dealer?',
        a: 'Register as a seller and complete verification requirements.'
      },
      {
        q: 'What benefits do R E stores provide?',
        a: 'Nationwide exposure to buyers, ability to list multiple products, and inventory and order management tools.'
      },
      {
        q: 'Can dealers manage multiple products?',
        a: 'Yes, dealers can create catalogs and manage multiple product listings.'
      }
    ]
  },
  {
    id: 'installers',
    title: 'Installer Services',
    items: [
      {
        q: 'What is the Installer?',
        a: 'The Installer feature connects customers with certified renewable energy technicians who can install solar systems or other energy equipment.'
      },
      {
        q: 'How do I request an installer?',
        a: 'Select the installer service, enter project details, and receive installer recommendations.'
      },
      {
        q: 'Are installers verified?',
        a: 'Installers on the platform are typically screened or certified to ensure competence.'
      },
      {
        q: 'Can installers register on the platform?',
        a: 'Yes. Renewable energy technicians can create installer accounts and offer services to customers.'
      }
    ]
  },
  {
    id: 'calculator',
    title: 'Solar Calculator',
    items: [
      {
        q: 'What is the RenewableZmart Calculator?',
        a: 'The calculator helps users estimate the size and cost of a solar energy system based on energy consumption.'
      },
      {
        q: 'What information is required to use the calculator?',
        a: 'Monthly electricity usage, location, type of building, and energy requirements.'
      },
      {
        q: 'What results does the calculator provide?',
        a: 'Recommended solar system size, estimated cost, potential savings, and equipment suggestions.'
      }
    ]
  },
  {
    id: 'pay-small-small',
    title: 'Pay Small Small Financing',
    items: [
      {
        q: 'What is Pay Small Small?',
        a: 'Pay Small Small is a financing plan that allows customers to pay for renewable energy equipment in installments instead of paying the full cost upfront.'
      },
      {
        q: 'What financing options are available?',
        a: 'Typical plans include 3-month and 6-month installment plans.'
      },
      {
        q: 'Does the financing include interest?',
        a: 'The platform advertises installment options with 0% interest and no hidden charges.'
      },
      {
        q: 'Who qualifies for Pay Small Small financing?',
        a: 'Eligibility depends on verification requirements such as credit checks or payment guarantees.'
      }
    ]
  },
  {
    id: 'flash-deals',
    title: 'Flash Deals',
    items: [
      {
        q: 'What are Flash Deals?',
        a: 'Flash Deals are limited-time discounts on renewable energy products.'
      },
      {
        q: 'How long do Flash Deals last?',
        a: 'Flash deals typically run for a short promotional period.'
      },
      {
        q: 'Can Flash Deal products be returned?',
        a: 'Return eligibility depends on the product and seller policies.'
      }
    ]
  },
  {
    id: 'swap',
    title: 'Swap Program',
    items: [
      {
        q: 'What is the Swap feature?',
        a: 'The Swap program allows customers to exchange older renewable energy equipment for newer or upgraded systems.'
      },
      {
        q: 'Which products can be swapped?',
        a: 'Possible items include solar batteries, inverters, panels, and energy storage systems.'
      },
      {
        q: 'How does the swap process work?',
        a: 'Submit details of existing equipment, receive a valuation, and apply credit toward new equipment.'
      }
    ]
  },
  {
    id: 'tracking',
    title: 'Order Tracking and Delivery',
    items: [
      {
        q: 'How do I track my order?',
        a: 'Use the Track Order page to see real-time order updates.'
      },
      {
        q: 'What is the delivery timeline?',
        a: 'Most orders are delivered within 3-7 business days depending on location and vendor.'
      },
      {
        q: 'Can I cancel my order?',
        a: 'Order cancellation depends on the seller policy and order status.'
      }
    ]
  },
  {
    id: 'security',
    title: 'Security and Privacy',
    items: [
      {
        q: 'Is my data secure?',
        a: 'We use secure protocols and data protection measures to safeguard your information.'
      },
      {
        q: 'How do I report suspicious activity?',
        a: 'Use the Report feature in the Help Center or contact our support team.'
      },
      {
        q: 'How can I contact support?',
        a: 'Visit the Contact Support page or use the in-app chat for faster help.'
      }
    ]
  }
]

export default function FAQ() {
  const [query, setQuery] = useState('')
  const [activeSection, setActiveSection] = useState(faqSections[0]?.id || '')
  const [openItem, setOpenItem] = useState<string | null>(null)

  const visibleSections = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return faqSections

    return faqSections
      .map((section) => {
        const filteredItems = section.items.filter((item) =>
          item.q.toLowerCase().includes(needle) || item.a.toLowerCase().includes(needle)
        )
        return { ...section, items: filteredItems }
      })
      .filter((section) => section.items.length > 0)
  }, [query])

  useEffect(() => {
    if (!visibleSections.length) return
    if (!activeSection || !visibleSections.some((section) => section.id === activeSection)) {
      setActiveSection(visibleSections[0].id)
    }
  }, [visibleSections, activeSection])

  const active = visibleSections.find((section) => section.id === activeSection)

  return (
    <>
      <Head>
        <title>FAQ - RenewableZmart</title>
        <meta name="description" content="Frequently asked questions about RenewableZmart" />
      </Head>
      <Header />
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-orange-600">Hi, how can we help you?</h1>
            <div className="mt-6 flex justify-center">
              <div className="w-full max-w-2xl flex items-center border-2 border-gray-800 rounded-full px-4 py-2 shadow-sm">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Have any questions? Ask them here!"
                  className="flex-1 bg-transparent outline-none text-gray-800 placeholder:text-gray-500"
                />
                <button
                  type="button"
                  className="ml-3 h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center"
                >
                  <span className="text-lg">🔍</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between text-sm">
            <Link href="/messages" className="text-gray-800 font-semibold hover:underline">
              Customer support records ›
            </Link>
            <span className="text-gray-400">All help topics</span>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
            <aside className="border rounded-2xl p-4 h-fit">
              <p className="text-sm font-bold text-gray-700 mb-3">Help topics</p>
              <div className="space-y-2">
                {visibleSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(section.id)
                      setOpenItem(null)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition ${
                      activeSection === section.id
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
                {!visibleSections.length && (
                  <p className="text-sm text-gray-500">No topics match your search.</p>
                )}
              </div>
            </aside>

            <section className="border rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900">
                {active?.title || 'Search results'}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {active?.items.length ? 'Select a question to see the answer.' : 'No results yet. Try a different search.'}
              </p>

              <div className="mt-6 divide-y">
                {(active?.items || []).map((item, index) => {
                  const key = `${active?.id || 'search'}-${index}`
                  const isOpen = openItem === key
                  return (
                    <div key={key} className="py-4">
                      <button
                        type="button"
                        onClick={() => setOpenItem(isOpen ? null : key)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <span className="font-semibold text-gray-900">{item.q}</span>
                        <span className="text-gray-500">{isOpen ? '▴' : '▾'}</span>
                      </button>
                      {isOpen && (
                        <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                          {item.a}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              {!active?.items?.length && (
                <div className="mt-6 text-sm text-gray-600">
                  Need more help? <Link href="/contact-admin" className="text-orange-600 font-semibold hover:underline">Contact support</Link>.
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
