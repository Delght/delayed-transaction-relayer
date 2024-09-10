import { useContext } from "react";
import { AppContext } from "../context";

export default function useAppConfig() {
  return useContext(AppContext)
}