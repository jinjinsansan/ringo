"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, statusOrder, type UserStatus } from "@/lib/user";

const steps: Array<{ label: string; path: string; status: UserStatus }> = [
  { label: "規約", path: "/terms", status: "registered" },
  { label: "説明", path: "/tutorial", status: "terms_agreed" },
  { label: "購入", path: "/purchase", status: "tutorial_completed" },
  { label: "報告", path: "/upload-screenshot", status: "ready_to_purchase" },
  { label: "登録", path: "/register-wishlist", status: "first_purchase_completed" },
  { label: "抽選", path: "/draw", status: "ready_to_draw" },
];

type Props = {
  currentStepIndex: number; // 0-based index corresponding to steps array
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
};

export function FlowLayout({ currentStepIndex, children, title, subtitle, onBack, showBack }: Props) {
  const router = useRouter();
  const { user } = useUser();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (currentStepIndex > 0) {
      router.push(steps[currentStepIndex - 1].path);
    }
  };

  const isStepAccessible = (stepIndex: number) => {
    if (!user) return false;
    if (stepIndex <= currentStepIndex) return true;
    
    // Check if user's actual status allows access to this step
    const targetStatus = steps[stepIndex].status;
    const userStatusIndex = statusOrder.indexOf(user.status);
    const targetStatusIndex = statusOrder.indexOf(targetStatus);
    
    return userStatusIndex >= targetStatusIndex;
  };

  return (
    <div className="min-h-screen bg-ringo-bg pb-20 font-body text-ringo-ink">
      {/* Header / Stepper */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-ringo-pink-soft/50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
             {showBack ? (
                <button 
                  onClick={handleBack}
                  className="text-ringo-rose font-bold text-sm hover:text-ringo-red flex items-center gap-1 transition-colors"
                >
                  <span className="text-lg">←</span> 戻る
                </button>
             ) : (
               <div className="w-10"></div>
             )}
             <div className="font-logo font-bold text-ringo-ink text-center text-sm sm:text-base">
               ステップ {currentStepIndex + 1} / {steps.length}
             </div>
             <div className="w-10"></div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
             <div className="absolute top-1/2 left-0 w-full h-1 bg-ringo-pink-soft rounded-full -z-10"></div>
             <div 
               className="absolute top-1/2 left-0 h-1 bg-ringo-rose rounded-full -z-10 transition-all duration-500"
               style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
             ></div>
             
             <div className="flex justify-between items-center">
                {steps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isCompleted = idx < currentStepIndex;
                  const canAccess = isStepAccessible(idx);
                  
                  // Wrap in Link only if accessible or completed
                  const isLink = canAccess;

                  if (isLink) {
                    return (
                      <Link 
                        key={idx} 
                        href={step.path}
                        className="flex flex-col items-center gap-1 group cursor-pointer"
                      >
                        <div 
                          className={`
                            w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300
                            ${isActive 
                              ? "bg-ringo-rose border-ringo-rose text-ringo-ink scale-110 shadow-lg shadow-ringo-rose/30" 
                              : isCompleted 
                                ? "bg-ringo-pink text-ringo-ink border-ringo-pink group-hover:bg-ringo-rose group-hover:border-ringo-rose" 
                                : "bg-white border-ringo-pink-soft text-ringo-pink group-hover:border-ringo-pink"
                            }
                          `}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </div>
                        <span className={`
                          text-[10px] sm:text-xs font-medium transition-colors hidden sm:block
                          ${isActive ? "text-ringo-rose" : ""}
                          ${isCompleted ? "text-ringo-pink group-hover:text-ringo-rose" : ""}
                          ${!isActive && !isCompleted ? "text-ringo-pink/70 group-hover:text-ringo-pink" : ""}
                        `}>
                          {step.label}
                        </span>
                      </Link>
                    );
                  }

                  return (
                    <div 
                      key={idx} 
                      className="flex flex-col items-center gap-1 group cursor-not-allowed opacity-60"
                    >
                      <div 
                        className={`
                          w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all duration-300
                          ${isActive 
                            ? "bg-ringo-rose border-ringo-rose text-ringo-ink scale-110 shadow-lg shadow-ringo-rose/30" 
                            : "bg-white border-gray-300 text-gray-400"
                          }
                        `}
                      >
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium transition-colors hidden sm:block text-gray-400">
                        {step.label}
                      </span>
                    </div>
                  );
                })}
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto px-6 py-8">
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold font-logo text-ringo-ink mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-500 text-sm sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 sm:p-10 shadow-ringo-card border border-white">
          {children}
        </div>
      </main>
    </div>
  );
}
