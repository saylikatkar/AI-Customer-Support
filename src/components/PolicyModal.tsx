import React from 'react';
import { BookOpen, X, Truck, RotateCcw, Ban, Banknote, ShieldCheck } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#FAF8F5] border border-[#E8DFD1] rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#2D5A35] text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl text-[#1E2B21] font-medium">
                Aura Skincare Brand Policies
              </h3>
              <p className="text-xs text-[#6B796E]">
                Official customer support guidelines enforced by Aria.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B786E] hover:bg-[#EFE8DC] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policies Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4 pr-1">
          {/* Shipping */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8DFD1]">
            <div className="flex items-center gap-2 mb-2 text-[#2A5732]">
              <Truck className="w-4 h-4" />
              <h4 className="font-serif text-base font-medium">Shipping Policy</h4>
            </div>
            <ul className="text-xs sm:text-sm text-[#4A594D] space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>Free Delivery:</strong> Granted strictly for orders{' '}
                <span className="text-[#214F29] font-semibold">above ₹499</span>.
              </li>
              <li>
                <strong>Standard Fee:</strong> Orders of ₹499 or below (including exactly ₹499) incur a{' '}
                <span className="font-semibold text-[#8B4D1B]">₹50 shipping fee</span>.
              </li>
              <li>
                <strong>Delivery Window:</strong> Standard delivery arrives within{' '}
                <span className="font-semibold">3–5 business days</span> across India.
              </li>
            </ul>
          </div>

          {/* Returns & Refunds */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8DFD1]">
            <div className="flex items-center gap-2 mb-2 text-[#2A5732]">
              <RotateCcw className="w-4 h-4" />
              <h4 className="font-serif text-base font-medium">Returns & Refunds</h4>
            </div>
            <ul className="text-xs sm:text-sm text-[#4A594D] space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>7-Day Window:</strong> Returns are accepted within{' '}
                <span className="font-semibold text-[#214F29]">7 days of delivery</span>.
              </li>
              <li>
                <strong>Hygiene & Safety:</strong> Skincare products must be unopened, unused, and in original sealed packaging.
              </li>
              <li>
                <strong>Damaged or Defective:</strong> Must be reported within{' '}
                <span className="font-semibold text-[#8B4D1B]">48 hours of delivery</span> with clear photos of the damage for a free replacement.
              </li>
            </ul>
          </div>

          {/* Cancellation */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8DFD1]">
            <div className="flex items-center gap-2 mb-2 text-[#2A5732]">
              <Ban className="w-4 h-4" />
              <h4 className="font-serif text-base font-medium">Cancellation Policy</h4>
            </div>
            <ul className="text-xs sm:text-sm text-[#4A594D] space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>Processing Only:</strong> Orders can only be cancelled while their live status is{' '}
                <span className="font-semibold text-[#8C5E14]">Processing</span>.
              </li>
              <li>
                <strong>Dispatched Orders:</strong> Once an order is Shipped or Out for Delivery, system cancellation is closed.
              </li>
              <li>
                <strong>Doorstep Refusal:</strong> Customers may politely refuse delivery at the doorstep when the courier arrives.
              </li>
            </ul>
          </div>

          {/* Cash on Delivery */}
          <div className="p-4 rounded-2xl bg-white border border-[#E8DFD1]">
            <div className="flex items-center gap-2 mb-2 text-[#2A5732]">
              <Banknote className="w-4 h-4" />
              <h4 className="font-serif text-base font-medium">Cash on Delivery (COD)</h4>
            </div>
            <ul className="text-xs sm:text-sm text-[#4A594D] space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                <strong>COD Limit:</strong> Available for orders up to{' '}
                <span className="font-semibold text-[#214F29]">₹2,500</span>.
              </li>
              <li>
                <strong>Payment at Doorstep:</strong> Pay by cash or UPI directly to the delivery executive.
              </li>
              <li>
                Orders above ₹2,500 require online prepayment.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#EFE8DC] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2D5A35] hover:bg-[#204426] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Close Policy Guide
          </button>
        </div>
      </div>
    </div>
  );
};
