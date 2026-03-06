import { useStore } from "../store";
import {
  Button,
  Card,
  TextField,
  Label,
  Input,
  Description,
  RadioGroup,
  Radio,
  Skeleton,
  Spinner,
} from "@heroui/react";
import { Trash2, Save } from "lucide-react";
import { useState, useEffect } from "react";

export function meta() {
  return [
    { title: "Settings — MS Scanner" },
    { name: "description", content: "Configure your scanner preferences." },
  ];
}

export default function Settings() {
  const { settings, updateSettings, clearRecentScans, recentScans } =
    useStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted">Configure scanner preferences</p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <Card.Header>
            <Card.Title>Scanner Preferences</Card.Title>
            <Card.Description>Default scanning behavior</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-6">
            <RadioGroup
              value={localSettings.defaultType}
              onChange={(value) =>
                setLocalSettings({
                  ...localSettings,
                  defaultType: value as "java" | "bedrock",
                })
              }
            >
              <Label>Default Server Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <Radio
                  value="java"
                  className="flex flex-row items-center gap-4 cursor-pointer rounded-xl border-2 border-transparent bg-default p-4 hover:bg-default-hover data-[selected=true]:border-accent data-[selected=true]:bg-accent/10 transition-colors"
                >
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Radio.Content>
                    <Label className="flex items-center gap-1.5 cursor-pointer">
                      <span className="font-semibold">Java Edition</span>
                    </Label>
                    <Description>Port 25565</Description>
                  </Radio.Content>
                </Radio>
                <Radio
                  value="bedrock"
                  className="flex flex-row items-center gap-4 cursor-pointer rounded-xl border-2 border-transparent bg-default p-4 hover:bg-default-hover data-[selected=true]:border-accent data-[selected=true]:bg-accent/10 transition-colors"
                >
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Radio.Content>
                    <Label className="flex items-center gap-1.5 cursor-pointer">
                      <span className="font-semibold">Bedrock Edition</span>
                    </Label>
                    <Description>Port 19132</Description>
                  </Radio.Content>
                </Radio>
              </div>
            </RadioGroup>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                value={String(localSettings.timeout)}
                onChange={(value) =>
                  setLocalSettings({
                    ...localSettings,
                    timeout: parseInt(value, 10) || 5000,
                  })
                }
                variant="secondary"
              >
                <Label>Timeout (ms)</Label>
                <Input type="number" min={1000} max={30000} />
                <Description>Wait time (1000-30000)</Description>
              </TextField>

              <TextField
                value={String(localSettings.concurrency)}
                onChange={(value) =>
                  setLocalSettings({
                    ...localSettings,
                    concurrency: Math.min(
                      100,
                      Math.max(1, parseInt(value, 10) || 5),
                    ),
                  })
                }
                variant="secondary"
              >
                <Label>Concurrency (threads)</Label>
                <Input type="number" min={1} max={100} />
                <Description>Simultaneous scans (1-100)</Description>
              </TextField>
            </div>
          </Card.Content>
          <Card.Footer className="flex justify-end gap-3 border-t border-separator border-opacity-50 pt-4">
            <Button
              type="submit"
              isDisabled={!hasChanges && !isSaved}
              isPending={isSaved}
            >
              {({ isPending }) => (
                <>
                  {isPending ? (
                    <Spinner color="current" size="sm" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Settings
                </>
              )}
            </Button>
          </Card.Footer>
        </Card>
      </form>

      <Card>
        <Card.Header>
          <Card.Title>Data Management</Card.Title>
          <Card.Description>Manage stored scan history</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-semibold">Recent Scans History</p>
              <p className="text-xs text-muted mt-1">
                {recentScans.length} server
                {recentScans.length !== 1 ? "s" : ""} currently stored in local
                cache
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              isDisabled={recentScans.length === 0}
              onPress={clearRecentScans}
            >
              <Trash2 className="w-4 h-4" />
              Clear Data
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
