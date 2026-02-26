import { useState } from "react";
import { KeyRound } from "lucide-react";
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
      setError("La clau és obligatòria");
      return;
    }
    login(trimmed, remember);
  }

  return (
    <Dialog open={!isAuthed}>
      <DialogContent
        className="sm:max-w-sm rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="size-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">
            Clau d'accés
          </DialogTitle>
          <DialogDescription className="text-center">
            Introdueix la clau que t'hem proporcionat
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="space-y-2">
            <Label htmlFor="token">Clau</Label>
            <Input
              id="token"
              type="password"
              placeholder="••••••••••••"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError("");
              }}
              className="h-11 rounded-xl"
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
            <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
              Recorda'm en aquest navegador
            </Label>
          </div>

          <Button type="submit" className="w-full h-11 rounded-xl text-sm font-medium">
            Entrar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
