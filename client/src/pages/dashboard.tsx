import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Key, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Copy,
  Play,
  RotateCcw,
  Activity,
  FileText,
  LogOut,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Key as KeyType, UserCooldown, BotLog } from "@shared/schema";

interface Stats {
  totalKeys: number;
  activeKeys: number;
  usersToday: number;
  successRate: number;
}

interface BotStatus {
  online: boolean;
  uptime: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    refetchInterval: 30000
  });

  const { data: recentKeys, isLoading: keysLoading } = useQuery<KeyType[]>({
    queryKey: ["/api/keys/recent"],
    refetchInterval: 30000
  });

  const { data: cooldowns, isLoading: cooldownsLoading } = useQuery<UserCooldown[]>({
    queryKey: ["/api/cooldowns"],
    refetchInterval: 30000
  });

  const { data: logs, isLoading: logsLoading } = useQuery<BotLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 30000
  });

  const { data: botStatus } = useQuery<BotStatus>({
    queryKey: ["/api/bot/status"],
    refetchInterval: 5000
  });

  const formatTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const getKeyStatus = (key: KeyType) => {
    const now = new Date();
    const expires = new Date(key.expiresAt);
    const timeLeft = expires.getTime() - now.getTime();
    
    if (!key.isActive || timeLeft <= 0) {
      return { status: "Expired", color: "bg-gray-500/10 text-gray-500", icon: XCircle };
    }
    
    if (timeLeft < 2 * 60 * 60 * 1000) { // Less than 2 hours
      return { status: "Expiring Soon", color: "bg-yellow-500/10 text-yellow-500", icon: AlertTriangle };
    }
    
    return { status: "Active", color: "bg-green-500/10 text-green-500", icon: CheckCircle };
  };

  const copyKey = (keyCode: string) => {
    navigator.clipboard.writeText(keyCode);
    toast({
      title: "Key copied!",
      description: "The key has been copied to your clipboard.",
    });
  };

  const simulateCommand = () => {
    toast({
      title: "Command Simulated",
      description: "This would simulate the /generate24key command in a real Discord server.",
    });
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (statsLoading || keysLoading || cooldownsLoading || logsLoading) {
    return (
      <div className="min-h-screen bg-discord-bg flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-bg text-white">
      {/* Header */}
      <div className="bg-discord-surface border-b border-discord-secondary/20 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/assets/prism-icon.png" alt="Prism Icon" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Prism Key Dashboard</h1>
              <p className="text-gray-400 mt-1">Manage your Roblox executor key generation</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${botStatus?.online ? 'bg-discord-success animate-pulse' : 'bg-red-500'}`}></div>
              <div>
                <p className="text-sm font-medium">{botStatus?.online ? 'Bot Online' : 'Bot Offline'}</p>
                <p className="text-xs text-gray-400">Uptime: {botStatus?.uptime || '0s'}</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">VIP User</span>
              </div>
            )}
            <Button className="bg-discord-primary hover:bg-discord-primary/80">
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleLogout} variant="outline" className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-discord-surface border border-discord-secondary/20">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Key Management
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-8 mt-8">
            <div className="space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-discord-surface border-discord-secondary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Keys Generated</p>
                    <p className="text-2xl font-bold mt-2">{stats?.totalKeys || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-discord-primary/10 rounded-lg flex items-center justify-center">
                    <Key className="text-discord-primary text-xl" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-discord-success">+12%</span>
                  <span className="text-gray-400 ml-2">from last week</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-discord-surface border-discord-secondary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Active Keys</p>
                    <p className="text-2xl font-bold mt-2">{stats?.activeKeys || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-discord-success/10 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-discord-success text-xl" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-discord-success">+5</span>
                  <span className="text-gray-400 ml-2">in last hour</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-discord-surface border-discord-secondary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Users Today</p>
                    <p className="text-2xl font-bold mt-2">{stats?.usersToday || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-discord-warning/10 rounded-lg flex items-center justify-center">
                    <Users className="text-discord-warning text-xl" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-discord-success">∞</span>
                  <span className="text-gray-400 ml-2">unlimited access</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-discord-surface border-discord-secondary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Success Rate</p>
                    <p className="text-2xl font-bold mt-2">{stats?.successRate || 0}%</p>
                  </div>
                  <div className="w-12 h-12 bg-discord-success/10 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-discord-success text-xl" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-discord-success">+0.3%</span>
                  <span className="text-gray-400 ml-2">improvement</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Command Simulator */}
          <Card className="bg-discord-surface border-discord-secondary/20">
            <CardHeader className="border-b border-discord-secondary/20">
              <CardTitle className="flex items-center">
                <Bot className="text-discord-primary mr-3" />
                Command Simulator
              </CardTitle>
              <p className="text-gray-400 text-sm">Test the /generate24key command</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-discord-bg rounded-lg p-4 font-mono text-sm mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-discord-primary rounded-full"></div>
                  <span className="text-discord-primary">TestUser#1234</span>
                  <span className="text-gray-400">Today at 2:34 PM</span>
                </div>
                <div className="text-gray-300">/generate24key</div>
              </div>
              
              <div className="bg-discord-bg rounded-lg p-4 font-mono text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-discord-success rounded-full"></div>
                  <span className="text-discord-success font-semibold">Key Bot</span>
                  <Badge className="bg-discord-primary text-xs">BOT</Badge>
                  <span className="text-gray-400">Today at 2:34 PM</span>
                </div>
                <div className="bg-discord-lighter/50 rounded p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-discord-success font-semibold">✅ Key Generated Successfully!</span>
                    <span className="text-xs text-gray-400">Expires in 24h</span>
                  </div>
                  <div className="bg-discord-bg rounded p-2 mb-3">
                    <div className="text-xs text-gray-400 mb-1">Your 24-hour key:</div>
                    <div className="flex items-center justify-between">
                      <code className="text-discord-success font-mono">PrismKey - A7F9 - 2K8N - Q5X3 - M1B6</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-discord-primary hover:text-discord-primary/80 p-1"
                        onClick={() => copyKey('PrismKey - A7F9 - 2K8N - Q5X3 - M1B6')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    ⏰ Expires: Tomorrow at 2:34 PM<br />
                    🔄 Unlimited key generation available!
                  </div>
                </div>
              </div>

              <Button onClick={simulateCommand} className="mt-4 bg-discord-primary hover:bg-discord-primary/80">
                <Play className="w-4 h-4 mr-2" />
                Simulate Command
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity & Key Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Keys */}
            <Card className="bg-discord-surface border-discord-secondary/20">
              <CardHeader className="border-b border-discord-secondary/20">
                <CardTitle className="flex items-center">
                  <Clock className="text-discord-primary mr-3" />
                  Recent Keys
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {recentKeys?.map((key) => {
                    const keyStatus = getKeyStatus(key);
                    const StatusIcon = keyStatus.icon;
                    
                    return (
                      <div key={key.id} className="flex items-center justify-between p-3 bg-discord-bg rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-discord-success/10 rounded-full flex items-center justify-center">
                            <StatusIcon className="text-discord-success text-sm" />
                          </div>
                          <div>
                            <p className="font-mono text-sm text-discord-success">{key.keyCode}</p>
                            <p className="text-xs text-gray-400">{key.discordUsername}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={keyStatus.color}>{keyStatus.status}</Badge>
                          <p className="text-xs text-gray-400 mt-1">{formatTimeLeft(key.expiresAt.toString())}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* User Cooldowns */}
            <Card className="bg-discord-surface border-discord-secondary/20">
              <CardHeader className="border-b border-discord-secondary/20">
                <CardTitle className="flex items-center">
                  <Clock className="text-discord-primary mr-3" />
                  User Cooldowns
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {cooldowns?.map((cooldown) => {
                    const now = new Date();
                    const isOnCooldown = cooldown.cooldownEnds > now;
                    
                    return (
                      <div key={cooldown.id} className="flex items-center justify-between p-3 bg-discord-bg rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">
                            {cooldown.discordUsername.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{cooldown.discordUsername}</p>
                            <p className="text-xs text-gray-400">ID: {cooldown.discordUserId}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={isOnCooldown ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"}>
                            {isOnCooldown ? "On Cooldown" : "Available"}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">
                            {isOnCooldown ? formatTimeLeft(cooldown.cooldownEnds.toString()) : "Can generate key"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bot Logs */}
          <Card className="bg-discord-surface border-discord-secondary/20">
            <CardHeader className="border-b border-discord-secondary/20">
              <CardTitle className="flex items-center">
                <FileText className="text-discord-primary mr-3" />
                Bot Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-64">
                <div className="bg-discord-bg rounded-lg p-4 font-mono text-sm space-y-2">
                  {logs?.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3">
                      <span className="text-gray-400 text-xs">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className={`text-xs ${
                        log.level === 'INFO' ? 'text-discord-success' :
                        log.level === 'WARN' ? 'text-discord-warning' :
                        'text-discord-error'
                      }`}>
                        [{log.level}]
                      </span>
                      <span className="text-gray-300">{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="keys" className="space-y-8 mt-8">
            <div className="text-center py-16">
              <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300">Key Management</h3>
              <p className="text-gray-400 mt-2">Advanced key management features coming soon</p>
            </div>
          </TabsContent>
          
          <TabsContent value="users" className="space-y-8 mt-8">
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300">User Management</h3>
              <p className="text-gray-400 mt-2">User management features coming soon</p>
            </div>
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-8 mt-8">
            <div className="text-center py-16">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300">Analytics</h3>
              <p className="text-gray-400 mt-2">Advanced analytics features coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
