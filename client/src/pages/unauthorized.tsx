import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900 text-white flex items-center justify-center">
      <div className="container mx-auto px-4">
        <Card className="max-w-md mx-auto bg-gray-800/50 border-gray-700">
          <CardHeader className="text-center">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-2xl text-white">Access Denied</CardTitle>
            <CardDescription className="text-gray-300">
              You are not authorized to access this VIP dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-400 mb-6">
              Only authorized VIP users can access this dashboard. If you believe this is an error, 
              please contact the administrator.
            </p>
            <Button 
              onClick={() => window.location.href = "/"}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}