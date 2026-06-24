import { PHRASES } from "@/lib/phrases";
import { applyOrder, shuffleOrder } from "@/lib/text";
import { supabase } from "@/lib/supabaseClient";

export type Room = {
  id?: string;
  code: string;
  seed: string;
  phrase_order: number[];
  critical_number: number;
  status: string;
};

export type RemotePlayer = {
  id?: string;
  room_code: string;
  player_id: string;
  name: string;
  progress: number;
  score: number;
  lives: number;
  phase_index: number;
  status: string;
  updated_at?: string;
};

export function makePlayerId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();

  const existing = window.localStorage.getItem("farol_player_id");
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem("farol_player_id", id);
  return id;
}

export function makeRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "FAROL-";
  for (let i = 0; i < 4; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

export async function createOnlineRoom(): Promise<Room> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const room: Room = {
    code: makeRoomCode(),
    seed: crypto.randomUUID(),
    phrase_order: shuffleOrder(PHRASES.length),
    critical_number: Math.floor(Math.random() * 6) + 1,
    status: "playing"
  };

  const { data, error } = await supabase
    .from("rooms")
    .insert(room)
    .select("*")
    .single();

  if (error) throw error;
  return data as Room;
}

export async function getRoom(code: string): Promise<Room> {
  if (!supabase) throw new Error("Supabase não configurado.");

  const normalized = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", normalized)
    .single();

  if (error) throw error;
  return data as Room;
}

export async function upsertPlayer(player: RemotePlayer): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("room_players").upsert(
    {
      ...player,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "room_code,player_id"
    }
  );

  if (error) {
    console.error("Erro ao sincronizar player:", error.message);
  }
}

export async function listPlayers(roomCode: string): Promise<RemotePlayer[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("room_players")
    .select("*")
    .eq("room_code", roomCode)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Erro ao listar jogadores:", error.message);
    return [];
  }

  return (data ?? []) as RemotePlayer[];
}

export function orderedPhrases(room: Room) {
  return applyOrder(PHRASES, room.phrase_order);
}
