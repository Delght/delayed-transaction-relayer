import { useContext } from "react";
import { AppContext } from "@/app/context";

export default function useAppConfig() {
  return useContext(AppContext)
}