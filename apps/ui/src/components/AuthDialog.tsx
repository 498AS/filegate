import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function AuthDialog() {
  const { isAuthed, login } = useAuth();
  const [token, setToken] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Token is required");
      return;
    }
    login(trimmed, remember);
  }

  return (
    <Dialog open={!isAuthed}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Authenticate</DialogTitle>
          <DialogDescription>
            Enter your API token to continue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">API Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="your-secret-token"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError("");
              }}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(c) => setRemember(c === true)}
            />
            <Label htmlFor="remember" className="text-sm font-normal">
              Remember on this browser
            </Label>
          </div>

          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
