import { auth } from "@/lib/auth"; // path to your auth file
import { toNodeHandler } from "better-auth/node";

export const GET = toNodeHandler(auth);
export const POST = toNodeHandler(auth);
