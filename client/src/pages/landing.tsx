import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Key, Users, Bot } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Prism Generator Dashboard
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Private VIP dashboard for monitoring Discord bot activity, managing access keys, 
            and tracking user statistics.
          </p>
          <Button 
            onClick={handleLogin}
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg"
          >
            <Shield className="mr-2 h-5 w-5" />
            Access VIP Dashboard
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <Key className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Key Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300">
                Monitor and track all generated access keys with real-time status updates.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <Users className="h-8 w-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">User Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300">
                View user statistics, cooldowns, and activity patterns.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <Bot className="h-8 w-8 text-green-400 mb-2" />
              <CardTitle className="text-white">Bot Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300">
                Real-time bot status, uptime tracking, and activity logs.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <Shield className="h-8 w-8 text-red-400 mb-2" />
              <CardTitle className="text-white">VIP Access</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300">
                Exclusive access for authorized VIP users only.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="text-center">
          <Card className="bg-gray-800/30 border-gray-700 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-white text-2xl">VIP Access Required</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-300 text-lg">
                This dashboard is restricted to authorized VIP users only. 
                Contact the administrator if you believe you should have access.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}