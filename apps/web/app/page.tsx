"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import styles from "./page.module.css";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Docs", href: "https://github.com/priyanshusaini105/glaze" },
  { label: "Pricing", href: "#pricing" },
];

const dropSpring = { type: "spring", damping: 20, stiffness: 100 };

const IconClipboard = () => (
  <svg viewBox="0 0 24 24" aria-hidden className={styles.icon}>
    <path
      fill="currentColor"
      d="M16 4h-2.18A3 3 0 0 0 11 3a3 3 0 0 0-2.82 1H6a2 2 0 0 0-2 2v12.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V6a2 2 0 0 0-2-2Zm-5-1.25A1.25 1.25 0 1 1 9.75 4 1.25 1.25 0 0 1 11 2.75Zm8 15.75a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V6a.5.5 0 0 1 .5-.5h1.51a3 3 0 0 0 2.99 2.75 3 3 0 0 0 2.99-2.75H18.5a.5.5 0 0 1 .5.5Z"
    />
  </svg>
);

const IconSpark = () => (
  <svg viewBox="0 0 24 24" aria-hidden className={styles.icon}>
    <path
      fill="currentColor"
      d="m11 2 1.74 5.19L18 9l-5.26 1.81L11 16l-1.74-5.19L4 9l5.26-1.81Z"
    />
  </svg>
);

function GradientOrb() {
  return (
    <motion.div
      className={styles.gradientOrb}
      animate={{
        scale: [1, 1.06, 1],
        opacity: [0.75, 0.95, 0.85],
        rotate: [0, 4, -2],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function FlowScene() {
  const domain = "acme.corp";
  const lookupText = "Scanning LinkedIn...";
  const resultText = "Found CEO — John Doe";

  return (
    <div className={styles.scene}>
      <motion.div
        className={styles.gridPlate}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      <motion.div
        className={styles.floatingCard}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.9, ease: "easeOut" }}
      >
        <div className={styles.cardHeader}>
          <span className={styles.pill}>Glaze Sheet</span>
          <div className={styles.statusDot} />
        </div>

        <div className={styles.table}>
          <div className={styles.tableHead}>
            <span>Domain</span>
            <span>Signal</span>
            <span>Result</span>
          </div>

          <motion.div
            className={styles.tableRow}
            initial={{ x: -120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, ...dropSpring }}
          >
            <div className={styles.cell}>{domain}</div>
            <div className={styles.cell}>CEO</div>
            <div className={styles.cellStack}>
              <motion.span
                className={styles.whisper}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5 }}
              >
                {lookupText}
              </motion.span>
              <motion.span
                className={styles.result}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                {resultText}
              </motion.span>
            </div>

            <motion.div
              className={styles.drop}
              initial={{ y: -140, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, ...dropSpring }}
            />

            <motion.div
              className={styles.flash}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              transition={{ delay: 1.15, duration: 0.9, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const [copied, setCopied] = useState(false);

  const copyCommand = useMemo(() => "npm install glaze", []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <div className={styles.page}>
      <GradientOrb />

      <div className={styles.navShell}>
        <div className={styles.navPill}>
          <div className={styles.brandMark}>
            <span className={styles.brandDot} />
            <span className={styles.brandName}>Glaze</span>
          </div>
          <div className={styles.navLinks}>
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))}
          </div>
          <div className={styles.navActions}>
            <div className={styles.githubStar}>
              <IconSpark />
              <span>3.2k</span>
            </div>
            <a className={styles.getStarted} href="https://vercel.com/new">
              Get Started
            </a>
          </div>
        </div>
      </div>

      <main className={styles.hero}>
        <div className={styles.copy}>
          <motion.div
            className={styles.badge}
            animate={{ boxShadow: ["0 0 0px rgba(34,211,238,0.25)", "0 0 30px rgba(139,92,246,0.35)", "0 0 0px rgba(244,114,182,0.2)"] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            v1.0 is now Public Beta
          </motion.div>
          <h1 className={styles.title}>
            Apply <span className={styles.gradientText}>Liquid Intelligence</span>
            <br />
            To Your Static Data.
          </h1>
          <p className={styles.subtitle}>
            The open-source, headless spreadsheet for RevOps. Stream AI reasoning
            directly into your cells without the black box.
          </p>
          <div className={styles.ctaRow}>
            <a
              className={`${styles.cta} ${styles.primary}`}
              href="https://vercel.com/new/clone?repository-url=https://github.com/priyanshusaini105/glaze"
            >
              Deploy to Vercel
            </a>
            <button
              type="button"
              className={`${styles.cta} ${styles.secondary}`}
              onClick={handleCopy}
            >
              <IconClipboard />
              {copied ? "Copied" : "Copy npm install glaze"}
            </button>
          </div>
        </div>

        <FlowScene />
      </main>
    </div>
  );
}
