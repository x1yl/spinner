"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { PlusCircle, Trash2, Settings, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Types
interface WheelItem {
  id: string;
  label: string;
  probability: number;
  color: string;
  hidden?: boolean;
}

// Constants
const COLORS = [
  "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0",
  "#9966FF", "#FF9F40", "#8AC926", "#1982C4",
  "#6A4C93", "#F15BB5",
] as const;

export function WheelSpinner() {
  // Wheel items state
  const [items, setItems] = useState<WheelItem[]>([
    { id: "1", label: "Prize 1", probability: 20, color: COLORS[0] },
    { id: "2", label: "Prize 2", probability: 20, color: COLORS[1] },
    { id: "3", label: "Prize 3", probability: 20, color: COLORS[2] },
    { id: "4", label: "Prize 4", probability: 20, color: COLORS[3] },
    { id: "5", label: "Prize 5", probability: 20, color: COLORS[4] },
  ]);
  const [newItemLabel, setNewItemLabel] = useState("");

  // Item editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingProbabilityId, setEditingProbabilityId] = useState<string | null>(null);
  const [editingProbability, setEditingProbability] = useState<string>("");

  // Wheel spinning state
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const [winnerHidden, setWinnerHidden] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  // Utility functions
  const calculateEqualShare = useCallback((visibleItems: WheelItem[]) => {
    const equalShare = Math.floor(100 / visibleItems.length);
    return visibleItems.map((item, index) => ({
      ...item,
      probability:
        index === visibleItems.length - 1
          ? 100 - equalShare * (visibleItems.length - 1)
          : equalShare,
    }));
  }, []);

  const getVisibleItems = useCallback((items: WheelItem[]) => {
    return items.filter(item => !item.hidden);
  }, []);

  // Sound effects handling
  const playSound = useCallback(async (audio: HTMLAudioElement | null) => {
    if (soundEnabled && audio) {
      audio.currentTime = 0;
      try {
        await audio.play();
      } catch (e) {
        console.error("Error playing sound:", e);
      }
    }
  }, [soundEnabled]);

  const stopSound = useCallback((audio: HTMLAudioElement | null) => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  // Initialize audio elements
  useEffect(() => {
    spinSoundRef.current = new Audio("/spin-sound.mp3");
    spinSoundRef.current.volume = 0.5;

    winSoundRef.current = new Audio("/win-sound.mp3");
    winSoundRef.current.volume = 0.7;

    return () => {
      spinSoundRef.current = null;
      winSoundRef.current = null;
    };
  }, []);

  // Normalize probabilities to ensure they sum to 100
  const normalizeProbabilities = useCallback((updatedItems: WheelItem[], fixedId?: string): WheelItem[] => {
    const safeItems = updatedItems.map(item => ({
      ...item,
      probability: Math.max(1, item.probability),
    }));

    const total = safeItems.reduce((sum, item) => sum + item.probability, 0);
    if (total === 0) return safeItems;

    if (fixedId) {
      const fixedItem = safeItems.find(item => item.id === fixedId);
      if (!fixedItem) return safeItems;

      const remainingTotal = 100 - fixedItem.probability;
      const otherItems = safeItems.filter(item => item.id !== fixedId);
      const otherItemsTotal = otherItems.reduce((sum, item) => sum + item.probability, 0);

      return safeItems.map(item => {
        if (item.id === fixedId) return item;
        const ratio = otherItemsTotal === 0 ? 1 : item.probability / otherItemsTotal;
        return {
          ...item,
          probability: Math.max(1, Math.round(remainingTotal * ratio)),
        };
      });
    }

    return safeItems.map(item => ({
      ...item,
      probability: Math.max(1, Math.round((item.probability / total) * 100)),
    }));
  }, []);

  // Item management
  const addItem = useCallback(() => {
    if (!newItemLabel.trim()) return;

    const newItem: WheelItem = {
      id: Date.now().toString(),
      label: newItemLabel,
      probability: 10,
      color: COLORS[items.length % COLORS.length],
    };

    setItems(items => normalizeProbabilities([...items, newItem]));
    setNewItemLabel("");
  }, [items.length, newItemLabel, normalizeProbabilities]);

  const removeItem = useCallback((id: string) => {
    if (items.length <= 2) return;

    setItems(items => {
      const updatedItems = items.filter(item => item.id !== id);
      const visibleItems = getVisibleItems(updatedItems);
      const normalizedVisible = calculateEqualShare(visibleItems);

      return updatedItems.map(item =>
        item.hidden ? item : normalizedVisible.find(ni => ni.id === item.id) || item
      );
    });
  }, [items.length, getVisibleItems, calculateEqualShare]);

  const updateProbability = useCallback((id: string, value: number) => {
    const newValue = Math.max(1, Math.min(99, value));
    setItems(items => 
      normalizeProbabilities(
        items.map(item => item.id === id ? { ...item, probability: newValue } : item),
        id
      )
    );
  }, [normalizeProbabilities]);

  const toggleItemVisibility = useCallback((id: string) => {
    setItems(items => {
      const updatedItems = items.map(item =>
        item.id === id ? { ...item, hidden: !item.hidden } : item
      );

      const visibleItems = getVisibleItems(updatedItems);
      const normalizedVisible = calculateEqualShare(visibleItems);

      return updatedItems.map(item =>
        item.hidden ? item : normalizedVisible.find(ni => ni.id === item.id) || item
      );
    });
  }, [getVisibleItems, calculateEqualShare]);

  // Item editing
  const startEditingItem = useCallback((item: WheelItem) => {
    setEditingItemId(item.id);
    setEditingLabel(item.label);
  }, []);

  const saveItemLabel = useCallback(() => {
    if (!editingItemId) return;

    setItems(items =>
      items.map(item =>
        item.id === editingItemId ? { ...item, label: editingLabel } : item
      )
    );
    setEditingItemId(null);
    setEditingLabel("");
  }, [editingItemId, editingLabel]);

  const startEditingProbability = useCallback((item: WheelItem) => {
    setEditingProbabilityId(item.id);
    setEditingProbability(item.probability.toString());
  }, []);

  const saveProbability = useCallback(() => {
    if (!editingProbabilityId) return;
    const value = Math.max(1, Math.min(99, parseInt(editingProbability) || 0));
    updateProbability(editingProbabilityId, value);
    setEditingProbabilityId(null);
    setEditingProbability("");
  }, [editingProbabilityId, editingProbability, updateProbability]);

  const cancelEditing = useCallback(() => {
    setEditingItemId(null);
    setEditingLabel("");
  }, []);

  const cancelEditingProbability = useCallback(() => {
    setEditingProbabilityId(null);
    setEditingProbability("");
  }, []);

  const removeWinnerItem = useCallback(() => {
    if (winner) {
      removeItem(winner.id);
      setWinner(null);
      setWinnerHidden(false);
    }
  }, [winner, removeItem]);

  // Wheel drawing
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const visibleItems = getVisibleItems(items);

    if (visibleItems.length === 0) {
      // Draw full circle with last hidden item's color
      const lastHiddenItem = items[items.length - 1];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = lastHiddenItem.color;
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Draw wheel segments for visible items
      const normalizedItems = normalizeProbabilities([...visibleItems]);
      let startAngle = (rotation * Math.PI) / 180;

      normalizedItems.forEach((item) => {
        const sliceAngle = (2 * Math.PI * item.probability) / 100;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px Arial";
        ctx.fillText(item.label, radius - 20, 5);
        ctx.restore();

        startAngle += sliceAngle;
      });
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(centerX + radius - 10, centerY);
    ctx.lineTo(centerX + radius + 10, centerY - 15);
    ctx.lineTo(centerX + radius + 10, centerY + 15);
    ctx.closePath();
    ctx.fillStyle = "#FF0000";
    ctx.fill();
  }, [items, rotation, normalizeProbabilities, getVisibleItems]);

  // Draw the wheel whenever items change
  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Animation
  const triggerConfetti = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (rect.left + rect.right) / 2 / window.innerWidth;
    const y = (rect.top + rect.bottom) / 2 / window.innerHeight;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x, y },
    });
  }, []);

  const determineWinner = useCallback((currentRotation: number, visibleItems: WheelItem[]) => {
    const normalizedAngle = currentRotation % 360;
    const normalizedItems = normalizeProbabilities([...visibleItems]);

    let currentAngle = 0;
    for (const item of normalizedItems) {
      const sliceAngle = (360 * item.probability) / 100;
      if (normalizedAngle >= currentAngle && normalizedAngle < currentAngle + sliceAngle) {
        return item;
      }
      currentAngle += sliceAngle;
    }
    return null;
  }, [normalizeProbabilities]);

  // Spin wheel animation
  const spinWheel = useCallback(() => {
    if (spinning) return;

    const visibleItems = getVisibleItems(items);
    if (visibleItems.length < 2) return;

    setSpinning(true);
    setWinner(null);
    playSound(spinSoundRef.current);

    const spinAngle = 1800 + Math.random() * 1800;
    let currentRotation = rotation;
    const startTime = Date.now();
    const duration = 5000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      currentRotation = rotation + spinAngle * easeOut(progress);
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        stopSound(spinSoundRef.current);

        const winningItem = determineWinner(currentRotation, visibleItems);
        if (winningItem) {
          setWinner(winningItem);
          playSound(winSoundRef.current);
          triggerConfetti();
        }

        setSpinning(false);
      }
    };

    animate();
  }, [
    spinning,
    items,
    rotation,
    playSound,
    stopSound,
    determineWinner,
    getVisibleItems,
    triggerConfetti,
  ]);

  return (
    <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col items-start">
        {" "}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            className="max-w-full h-auto"
          />

          <Button
            onClick={spinWheel}
            disabled={
              spinning || items.filter((item) => !item.hidden).length < 2
            }
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 hover:bg-red-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
          >
            SPIN
          </Button>
        </div>
        {winner && !winnerHidden && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setWinner(null)}
          />
        )}
        <AnimatePresence>
          {winner && !winnerHidden && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                 bg-white rounded-lg shadow-xl p-6 border z-50 w-[90%] max-w-md"
            >
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold text-yellow-600 mb-2">
                  Winner!
                </h2>
                <p className="text-3xl font-extrabold text-gray-800 mb-4">
                  {winner.label}
                </p>

                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => setWinner(null)}>
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      toggleItemVisibility(winner.id);
                      setWinner(null); // Close the popup after hiding
                    }}
                  >
                    Hide
                  </Button>
                  <Button variant="destructive" onClick={removeWinnerItem}>
                    Remove Item
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="mt-4 pl-65"
          aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </Button>
      </div>

      <div className="flex flex-col gap-4 w-lg">
        <Card>
          <CardContent className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Settings size={20} />
                Wheel Settings
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder="Add new item..."
                  className="flex-1"
                />
                <Button onClick={addItem} size="icon">
                  <PlusCircle size={20} />
                </Button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "space-y-2 p-3 rounded-lg border",
                      item.hidden && "opacity-50 bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {editingItemId === item.id ? (
                          <div className="flex gap-2 flex-1">
                            <Input
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={saveItemLabel}
                              className="h-8"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              className="h-8"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between flex-1">
                            <span className="font-medium">{item.label}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleItemVisibility(item.id)}
                                className="h-8 w-8"
                              >
                                {item.hidden ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                    <line x1="2" y1="2" x2="22" y2="22" />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditingItem(item)}
                                className="h-8 w-8"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-pencil"
                                >
                                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                className={cn(
                                  "h-8 w-8",
                                  items.length <= 2 &&
                                    "opacity-50 cursor-not-allowed"
                                )}
                                disabled={items.length <= 2}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Label className="w-24 text-sm flex-shrink-0">
                        {editingProbabilityId === item.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editingProbability}
                              onChange={(e) =>
                                setEditingProbability(e.target.value)
                              }
                              className="h-8 w-20"
                              min={1}
                              max={100}
                              autoFocus
                              onBlur={saveProbability} // Add this line
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveProbability();
                                if (e.key === "Escape")
                                  cancelEditingProbability();
                              }}
                            />
                            <span className="text-sm">%</span>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() => startEditingProbability(item)}
                          >
                            {item.probability}%
                          </Button>
                        )}
                      </Label>
                      <Slider
                        value={[item.probability]}
                        min={1}
                        max={100}
                        step={1}
                        onValueChange={(value) =>
                          updateProbability(item.id, value[0])
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
