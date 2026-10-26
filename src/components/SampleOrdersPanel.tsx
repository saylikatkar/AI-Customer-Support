import React, { useState } from 'react';
import { Package, Copy, Check, RotateCcw, Truck, AlertTriangle, ExternalLink } from 'lucide-react';
import { Order } from '../types/client.ts';

interface SampleOrdersPanelProps {
  orders: Order[];
  onAskAboutOrder: (query: string) => void;
  onResetOrders: () => void;
}

export const SampleOrdersPanel: React.FC<SampleOrdersPanelProps> = ({
  orders,
  onAskAboutOrder,
  onResetOrders,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'Out for Delivery':
        return 'bg-[#E3EFE3] text-[#24542B] border-[#BEDBBE]';
      case 'Delivered':
        return 'bg-[#EAEFF7] text-[#24426A] border-[#C3D2E6]';
      case 'Processing':
        return 'bg-[#FFF6E5] text-[#8C5E14] border-[#E8D4AE]';
      case 'Cancelled':
        return 'bg-[#FBEBE8] text-[#9E392B] border-[#ECC4BD]';
      default:
        return 'bg-[#F3EFE7] text-[#554D41] border-[#DDD5C5]';
    }
  };

  return (
    <div className="rounded-3xl bg-[#FFFFFF]/75 border border-[#E8DFD1] p-5 sm:p-6 shadow-[0_10px_35px_-20px_rgba(45,78,53,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DC]">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#355C3A]" />
            <h3 className="font-serif text-base sm:text-lg text-[#1C291E] font-medium">
              Sample Demonstration Orders
            </h3>
          </div>
          <p className="text-xs text-[#6B796E] mt-0.5">
            Verified backend test records for tracking, cancellations & returns.
          </p>
        </div>

        <button
          onClick={onResetOrders}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#DFD6C7] bg-[#F7F4EE] hover:bg-[#EFE8DC] text-xs font-medium text-[#3D4D3F] transition-colors cursor-pointer"
          title="Reseed sample records to initial state"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#355C3A]" />
          <span className="hidden sm:inline">Reset Orders</span>
        </button>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
        {orders.map((order) => {
          return (
            <div
              key={order.id}
              className="rounded-2xl border border-[#E8DFD1] bg-[#FAF8F5] p-4 flex flex-col justify-between hover:border-[#CFDFCE] transition-all hover:shadow-xs group"
            >
              <div>
                {/* Top: ID + Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#1E2E20] bg-white px-2 py-0.5 rounded-md border border-[#E3DACB]">
                      {order.id}
                    </span>
                    <button
                      onClick={() => handleCopy(order.id)}
                      className="p-1 rounded hover:bg-[#EAE2D5] text-[#718274] transition-colors cursor-pointer"
                      title="Copy order ID"
                    >
                      {copiedId === order.id ? (
                        <Check className="w-3.5 h-3.5 text-[#24542B]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Customer & Product */}
                <h4 className="text-sm font-semibold text-[#1C2A1E]">
                  {order.productName}
                </h4>
                <p className="text-xs text-[#5D6B60] mt-0.5">
                  Customer: {order.customerName}
                </p>

                {/* Price + Courier info */}
                <div className="mt-2.5 pt-2 border-t border-[#EFE8DC] text-xs space-y-1">
                  <div className="flex justify-between text-[#627065]">
                    <span>Value:</span>
                    <span className="font-semibold text-[#1E2B21]">₹{order.value}</span>
                  </div>
                  {order.courier && (
                    <div className="flex justify-between text-[#627065]">
                      <span>Courier:</span>
                      <span className="font-medium text-[#2C3B2E]">
                        {order.courier} ({order.trackingNumber})
                      </span>
                    </div>
                  )}
                  {order.expectedDelivery && (
                    <div className="flex justify-between text-[#627065]">
                      <span>Expected:</span>
                      <span className="font-medium text-[#2E5835]">
                        {order.expectedDelivery}
                      </span>
                    </div>
                  )}
                </div>

                {/* Scenario Hint Note */}
                <p className="mt-2 text-[11px] text-[#758477] bg-white/70 p-2 rounded-xl border border-[#EDE5D8] italic">
                  {order.notes}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-3.5 pt-2 border-t border-[#EFE8DC] flex items-center gap-2">
                <button
                  onClick={() => onAskAboutOrder(`Where is order ${order.id}?`)}
                  className="flex-1 text-[11px] py-1.5 px-2 rounded-xl bg-[#EAF2EA] hover:bg-[#D9EADB] text-[#24522D] font-medium border border-[#BED7BE] transition-colors text-center cursor-pointer"
                >
                  Track Order
                </button>
                {order.status === 'Processing' && (
                  <button
                    onClick={() => onAskAboutOrder(`Cancel order ${order.id}`)}
                    className="flex-1 text-[11px] py-1.5 px-2 rounded-xl bg-[#FAF0EE] hover:bg-[#F3DDD9] text-[#9E392B] font-medium border border-[#EAC7C1] transition-colors text-center cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}
                {order.status === 'Delivered' && (
                  <button
                    onClick={() => onAskAboutOrder(`I received sunscreen 14 days ago. Can I return ${order.id}?`)}
                    className="flex-1 text-[11px] py-1.5 px-2 rounded-xl bg-[#F4EFE6] hover:bg-[#EAE2D3] text-[#4E4133] font-medium border border-[#DECDB8] transition-colors text-center cursor-pointer"
                  >
                    Return Check
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
