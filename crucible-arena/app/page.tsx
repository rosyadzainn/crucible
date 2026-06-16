import type { Metadata } from "next";
import LandingContent from "./landing-content";
import "./landing.css";

export const metadata: Metadata = {
  title: "Crucible — Adversarial Document Hardening",
  description:
    "Crucible turns three adversarial AI agents loose on your most dangerous documents, then seals every step in a tamper-evident record.",
};

export default function Home() {
  return <LandingContent />;
}
