import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
            
              <span className="block text-2xl lg:text-3xl font-normal text-gray-600 mt-2">
              Parcel-Centric Linking of the Global SDG Indicator Framework to the Land Administration Domain Model               </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-10">
              Exploring the intersection between SDG indicators and the Land Administration Domain Model (LADM) 
              for better urban planning and sustainable development.
            </p>
          </div>
        </div>
      </div>

      {/* Features Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Demo Card */}
          <Link 
            href="/demo-1131" 
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200"
          >
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    SDG 11.3.1 Demo
                  </h2>
                  <span className="text-sm text-blue-600 font-medium">Interactive Demo</span>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Land consumption rate vs population growth rate analysis with interactive maps and real-time calculations.
              </p>
              <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-1 transition-transform">
                Explore Demo
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Explorer Card */}
          <Link 
            href="/explorer" 
            className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-green-200"
          >
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                    Indicator Explorer
                  </h2>
                  <span className="text-sm text-green-600 font-medium">Browse & Search</span>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                Comprehensive crosswalk table showing relationships between SDG indicators and LADM components.
              </p>
              <div className="flex items-center text-green-600 font-medium group-hover:translate-x-1 transition-transform">
                Browse Indicators
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">17</div>
              <div className="text-gray-600">SDG Goals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">251</div>
              <div className="text-gray-600">SDG Targets</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">ISO 19152</div>
              <div className="text-gray-600">LADM Standard</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
  