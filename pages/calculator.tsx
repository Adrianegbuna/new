import Head from 'next/head'
import Header from '../components/Header'
import { useState, ChangeEvent } from 'react'
import Link from 'next/link'

type Appliance = { id: number; name: string; watts: number | string; hours: number | string; quantity: number | string }

export default function Calculator() {
  const [appliances, setAppliances] = useState<Appliance[]>([{ id: 1, name: '', watts: '', hours: '', quantity: 1 }])
  const [systemVoltage, setSystemVoltage] = useState('12')
  const [backupHours, setBackupHours] = useState('4')
  const [efficiency, setEfficiency] = useState('85')

  const commonAppliances = [
    { name: 'LED Bulb (10W)', watts: 10 },
    { name: 'LED Bulb (15W)', watts: 15 },
    { name: 'Ceiling Fan', watts: 75 },
    { name: 'Standing Fan', watts: 60 },
    { name: 'TV (32")', watts: 50 },
    { name: 'TV (55")', watts: 120 },
    { name: 'Laptop', watts: 65 },
    { name: 'Desktop Computer', watts: 200 },
    { name: 'Phone Charger', watts: 10 },
    { name: 'WiFi Router', watts: 15 },
    { name: 'Refrigerator', watts: 150 },
    { name: 'Freezer', watts: 200 },
    { name: 'Microwave', watts: 1000 },
    { name: 'Blender', watts: 400 },
    { name: 'Iron', watts: 1200 },
    { name: 'Air Conditioner (1HP)', watts: 1000 },
    { name: 'Air Conditioner (1.5HP)', watts: 1500 },
    { name: 'Washing Machine', watts: 500 },
    { name: 'Water Pump', watts: 750 },
    { name: 'DSTV Decoder', watts: 25 },
  ]

  const addAppliance = () => {
    setAppliances([...appliances, { id: Date.now(), name: '', watts: '', hours: '', quantity: 1 }])
  }

  const removeAppliance = (id: number) => {
    setAppliances(appliances.filter((a) => a.id !== id))
  }

  const updateAppliance = (id: number, field: keyof Appliance, value: string | number) => {
    setAppliances(
      appliances.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    )
  }

  const selectCommonAppliance = (id: number, appliance: { name: string; watts: number }) => {
    setAppliances(appliances.map((a) => (a.id === id ? { ...a, name: appliance.name, watts: appliance.watts } : a)))
  }

  const totalWatts = appliances.reduce((sum, a) => sum + Number(a.watts || 0) * Number(a.quantity || 1), 0)
  const dailyWattHours = appliances.reduce((sum, a) => sum + Number(a.watts || 0) * Number(a.hours || 0) * Number(a.quantity || 1), 0)
  const inverterSize = totalWatts * 1.25
  const inverterSizeKVA = (inverterSize / 1000).toFixed(2)
  const backupHoursNum = Number(backupHours || 0)
  const systemVoltageNum = Number(systemVoltage || 12)
  const efficiencyRatio = Number(efficiency || 85) / 100
  const backupEnergyWh = totalWatts * backupHoursNum
  const batteryCapacityAh = systemVoltageNum > 0 && efficiencyRatio > 0
    ? (backupEnergyWh / (systemVoltageNum * efficiencyRatio))
    : 0
  const effectiveDailyWh = dailyWattHours > 0 ? dailyWattHours : backupEnergyWh
  const solarPanelSize = effectiveDailyWh > 0 ? (effectiveDailyWh / 5) : 0
  const numberOfPanels = solarPanelSize > 0 ? Math.ceil(solarPanelSize / 300) : 0

  const recommendedProducts = {
    inverter:
      inverterSize < 1000 ? '1KVA Mini Inverter' :
      inverterSize < 2000 ? '1.5KVA Inverter' :
      inverterSize < 3000 ? '2.5KVA Pure Sine Wave Inverter' :
      inverterSize < 4000 ? '3.5KVA Pure Sine Wave Inverter' :
      inverterSize < 6000 ? '5KVA Hybrid Solar Inverter' :
      inverterSize < 8500 ? '7.5KVA Pure Sine Wave Inverter' :
      '10KVA Three Phase Inverter',
    battery:
      batteryCapacityAh < 100 ? '12V 100Ah Battery' :
      batteryCapacityAh < 150 ? '12V 150Ah Gel Battery' :
      batteryCapacityAh < 200 ? '12V 200Ah Deep Cycle Battery' :
      batteryCapacityAh < 250 ? '24V 200Ah AGM Battery' :
      '48V 100Ah LiFePO4 Battery',
    panels:
      numberOfPanels === 0 ? '0 x 200W Panels' :
      numberOfPanels <= 2 ? `${numberOfPanels} x 200W Panels` :
      numberOfPanels <= 4 ? `${numberOfPanels} x 300W Panels` :
      `${numberOfPanels} x 400W Panels`,
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Head>
        <title>Load Calculator - RenewableZmart</title>
        <meta name="description" content="Calculate your power requirements for solar, inverter, and battery systems" />
      </Head>
      <Header />

      <main>
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold mb-2">⚙️ Load & Circuit Calculator</h1>
            <p className="text-xl text-white font-bold">Calculate your power requirements and get product recommendations</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold mb-4 text-black">Add Your Appliances</h2>
                {appliances.map((appliance, index) => (
                  <div key={appliance.id} className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-black">Appliance {index + 1}</h3>
                      {appliances.length > 1 && (
                        <button onClick={() => removeAppliance(appliance.id)} className="text-red-500 hover:text-red-700">🗑️ Remove</button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-sm font-bold text-black mb-1">Appliance Name</label>
                        <input type="text" value={appliance.name} onChange={(e) => updateAppliance(appliance.id, 'name', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-teal-600 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="e.g., Ceiling Fan" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-black mb-1">Quick Select</label>
                        <select onChange={(e) => { const selected = commonAppliances.find((a) => a.name === e.target.value); if (selected) selectCommonAppliance(appliance.id, selected) }} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 font-semibold">
                          <option value="">-- Select Common Appliance --</option>
                          {commonAppliances.map((a) => (<option key={a.name} value={a.name}>{a.name}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-black mb-1">Power (Watts)</label>
                        <input type="number" value={appliance.watts} onChange={(e) => updateAppliance(appliance.id, 'watts', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="100" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-black mb-1">Hours/Day</label>
                        <input type="number" value={appliance.hours} onChange={(e) => updateAppliance(appliance.id, 'hours', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="4" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-black mb-1">Quantity</label>
                        <input type="number" value={appliance.quantity} onChange={(e) => updateAppliance(appliance.id, 'quantity', e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="1" min={1} />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addAppliance} className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700">+ Add Another Appliance</button>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4 text-black">System Configuration</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-black mb-1">System Voltage</label>
                    <select value={systemVoltage} onChange={(e) => setSystemVoltage(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-teal-600 text-black dark:text-white bg-white dark:bg-gray-800 border-black dark:border-gray-600 font-semibold">
                      <option value="12">12V</option>
                      <option value="24">24V</option>
                      <option value="48">48V</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black mb-1">Backup Hours</label>
                    <input type="number" value={backupHours} onChange={(e) => setBackupHours(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="4" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black mb-1">Efficiency (%)</label>
                    <input type="number" value={efficiency} onChange={(e) => setEfficiency(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500 text-black dark:text-white placeholder:text-gray-600 dark:placeholder:text-gray-400 font-semibold" placeholder="85" min={50} max={100} />
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                <h2 className="text-2xl font-bold mb-4 text-black">Calculation Results</h2>
                <div className="space-y-4">
                  <div className="bg-teal-50 p-4 rounded-lg"><div className="text-sm text-black font-bold">Total Load</div><div className="text-3xl font-bold text-teal-700">{totalWatts.toFixed(0)}W</div></div>
                  <div className="bg-green-50 p-4 rounded-lg"><div className="text-sm text-black font-bold">Daily Energy</div><div className="text-2xl font-bold text-green-600">{dailyWattHours.toFixed(0)}Wh</div></div>
                  <div className="border-t pt-4"><h3 className="font-bold mb-2 text-black">Recommended Inverter</h3><div className="text-lg font-bold text-teal-700">{inverterSizeKVA} KVA</div><div className="text-sm text-black font-bold">({inverterSize.toFixed(0)}W)</div><div className="text-sm mt-1 text-black font-bold">{recommendedProducts.inverter}</div></div>
                  <div className="border-t pt-4"><h3 className="font-bold mb-2 text-black">Recommended Battery</h3><div className="text-lg font-bold text-green-600">{batteryCapacityAh.toFixed(0)}Ah</div><div className="text-sm text-black font-bold">at {systemVoltage}V</div><div className="text-sm mt-1 text-black font-bold">{recommendedProducts.battery}</div></div>
                  <div className="border-t pt-4"><h3 className="font-bold mb-2 text-black">Recommended Solar Panels</h3><div className="text-lg font-bold text-blue-600">{solarPanelSize.toFixed(0)}W</div><div className="text-sm text-black font-bold">Total capacity needed</div><div className="text-sm mt-1 text-black font-bold">{recommendedProducts.panels}</div></div>
                  <div className="border-t pt-4">
                    <Link href="/marketplace" className="block w-full bg-slate-700 text-white text-center py-3 rounded-lg font-bold hover:bg-slate-800 mb-2">Shop Inverters</Link>
                    <Link href="/marketplace" className="block w-full bg-emerald-600 text-white text-center py-3 rounded-lg font-bold hover:bg-emerald-700 mb-2">Shop Batteries</Link>
                    <Link href="/marketplace" className="block w-full bg-teal-600 text-white text-center py-3 rounded-lg font-bold hover:bg-teal-700">Shop Solar Panels</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 text-black">📖 How to Use This Calculator</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div><h3 className="font-bold text-lg mb-2 text-black">1. Add Your Appliances</h3><p className="text-sm text-black font-bold">List all electrical appliances you want to power. Use the quick select dropdown for common items or enter custom values.</p></div>
              <div><h3 className="font-bold text-lg mb-2 text-black">2. Configure System</h3><p className="text-sm text-black font-bold">Set your preferred system voltage (12V, 24V, or 48V), desired backup hours, and system efficiency percentage.</p></div>
              <div><h3 className="font-bold text-lg mb-2 text-black">3. Get Recommendations</h3><p className="text-sm text-black font-bold">View calculated requirements for inverter size, battery capacity, and solar panel needs based on your inputs.</p></div>
            </div>
          </div>
        </div>
      </main>

    </div>
  )
}




