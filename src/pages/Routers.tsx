import { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Router as RouterIcon, Settings, Wifi, WifiOff, Copy, Check, Link2, Download, RefreshCw, Trash2, MoreHorizontal, Eye, RotateCcw, Power, Activity, Shield, Network } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateMikroTikScript } from "@/lib/mikrotik-script";

interface RouterDevice {
  id: string;
  name: string;
  location: string;
  ip_address: string;
  api_port: number;
  username: string;
  model: string;
  status: string;
  active_users: number;
  payment_destination: string;
  disable_sharing: boolean;
  device_tracking: boolean;
  bandwidth_control: boolean;
  session_logging: boolean;
  dns_name: string | null;
  hotspot_address: string | null;
  provision_token: string | null;
  org_id: string | null;
  connection_type: string;
  radius_server_ip?: string;
  radius_server_secret?: string;
  hotspot_interfaces: string[];
  pppoe_interfaces: string[];
  radius_server_id?: string;
  router_control_enabled: boolean;
  created_at?: string;
  password?: string;
  cpu_load?: number;
  free_memory?: number;
  total_memory?: number;
  hotspot_active_users?: number;
  pppoe_active_users?: number;
  uptime_seconds?: number;
  uptime_24h?: number;
  downtime_24h?: number;
  availability_24h?: number;
  board_name?: string;
  version?: string;
  last_seen_at?: string;
}

const emptyForm = {
  name: "",
  location: "",
  ip_address: "192.168.88.1",
  api_port: 8728,
  username: "admin",
  password: "",
  dns_name: "hotspot.local",
  hotspot_address: "10.5.50.1/24",
  payment_destination: "Till",
  connection_type: "hotspot",
  radius_server_ip: "",
  radius_server_secret: "",
  hotspot_interfaces: ["ether2"],
  pppoe_interfaces: ["ether1"],
  radius_server_id: "",
  router_control_enabled: true,
  disable_sharing: false,
  device_tracking: true,
  bandwidth_control: true,
  session_logging: true,
};
