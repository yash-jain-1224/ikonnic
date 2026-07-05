"use client";

import Link from "next/link";
import Script from "next/script";
import { CheckCircle2, CreditCard, Loader2, Truck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCartStore } from "@/store/cart";
import { useOrderStore } from "@/store/orders";
import { useAuthStore } from "@/store/auth";
import { ordersAPI, paymentsAPI, shippingAPI, usersAPI } from "@/lib/api";
import { formatAddress, type SavedAddress } from "@/components/account/AddressBook";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function CheckoutClient() {
  const items = useCartStore((state) => state.items);
  const coupon = useCartStore((state) => state.coupon);
  const clearCart = useCartStore((state) => state.clearCart);
  const createOrder = useOrderStore((state) => state.createOrder);
  const { user, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState("");
  const [pin, setPin] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [loadingPin, setLoadingPin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">("RAZORPAY");
  const [processing, setProcessing] = useState(false);
  const [serviceability, setServiceability] = useState<{ serviceable: boolean; estimatedDays?: number; codAvailable?: boolean } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  useEffect(() => setMounted(true), []);

  // Load saved addresses for signed-in users and preselect the default one
  useEffect(() => {
    if (!isAuthenticated) return;
    usersAPI.getAddresses()
      .then(({ data }) => {
        const list: SavedAddress[] = Array.isArray(data) ? data : [];
        setSavedAddresses(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) {
          setSelectedAddressId(preferred.id);
          setPin(preferred.pincode);
          setCity(preferred.city);
          setStateName(preferred.state);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const selectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setPin(addr.pincode);
    setCity(addr.city);
    setStateName(addr.state);
  };

  // Pincode lookup
  useEffect(() => {
    if (pin.length === 6) {
      setLoadingPin(true);
      // First try our backend
      shippingAPI.checkServiceability(pin)
        .then(({ data }) => {
          if (data.serviceable) {
            setCity(data.city);
            setStateName(data.state);
            setServiceability(data);
          } else {
            // Fallback to postal API for city/state
            fetch(`https://api.postalpincode.in/pincode/${pin}`)
              .then((res) => res.json())
              .then((resp) => {
                if (resp?.[0]?.Status === "Success") {
                  const po = resp[0].PostOffice[0];
                  setCity(po.District);
                  setStateName(po.State);
                }
              });
            setServiceability({ serviceable: false });
          }
        })
        .catch(() => {
          // Fallback
          fetch(`https://api.postalpincode.in/pincode/${pin}`)
            .then((res) => res.json())
            .then((data) => {
              if (data?.[0]?.Status === "Success") {
                const po = data[0].PostOffice[0];
                setCity(po.District);
                setStateName(po.State);
              }
            });
        })
        .finally(() => setLoadingPin(false));
    }
  }, [pin]);

  if (!mounted) return <div className="h-72 animate-pulse rounded-3xl bg-white" />;
  if (!items.length && !placedOrderId) return <EmptyState title="Nothing to check out yet" />;

  const subtotal = items.reduce((sum, item) => sum + (item.finalTotal ?? item.price * item.quantity), 0);

  // Handle Razorpay payment
  const handleRazorpayPayment = async (orderId: string, paymentData: any) => {
    return new Promise<boolean>((resolve) => {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: paymentData.gatewayData?.amount,
        currency: "INR",
        name: "Ikonnic",
        description: "Personalised Gifts Order",
        order_id: paymentData.gatewayOrderId,
        handler: async (response: any) => {
          try {
            await paymentsAPI.verify(paymentData.paymentId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            resolve(true);
          } catch {
            resolve(false);
          }
        },
        prefill: {
          name: user?.firstName || "",
          email: user?.email || "",
        },
        theme: { color: "#e11d48" },
        modal: {
          ondismiss: () => resolve(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProcessing(true);
    const data = new FormData(event.currentTarget);

    try {
      if (isAuthenticated) {
        // Resolve shipping address: use the saved selection or persist the new one
        let addressId: string | undefined;
        if (selectedAddressId !== "new") {
          addressId = selectedAddressId;
        } else {
          try {
            const { data: newAddress } = await usersAPI.addAddress({
              type: "BOTH",
              fullName: String(data.get("name") || ""),
              phone: String(data.get("phone") || ""),
              streetLine1: String(data.get("address") || ""),
              city: String(data.get("city") || ""),
              state: String(data.get("state") || ""),
              pincode: String(data.get("pin") || ""),
              country: String(data.get("country") || "India"),
            });
            addressId = newAddress?.id;
          } catch {
            // Order can still proceed without a saved address record
          }
        }

        // Real backend flow
        const orderPayload = {
          billingAddressId: addressId,
          shippingAddressId: addressId,
          items: items.map((item) => ({
            productId: item.productId,
            title: item.title,
            sku: item.productSlug || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? item.price,
            optionsPrice: item.optionsPrice ?? 0,
            discount: item.discount ?? 0,
            selectedOptions: item.selectedOptions ?? {},
            uploadedImageRef: item.uploadedImageReference || item.uploadedImagePreview,
            previewImage: item.previewImage,
            customisationJson: item.customisationJson,
          })),
          paymentMethod,
          couponCode: coupon || undefined,
          customerNotes: String(data.get("notes") || ""),
        };

        const { data: order } = await ordersAPI.create(orderPayload);

        if (paymentMethod === "RAZORPAY") {
          // Initiate payment
          const { data: paymentData } = await paymentsAPI.initiate(order.id, "RAZORPAY");
          const success = await handleRazorpayPayment(order.id, paymentData);
          if (!success) {
            setProcessing(false);
            return;
          }
        }

        setPlacedOrderId(order.orderNumber);
        clearCart();
      } else {
        // Fallback: localStorage demo for non-authenticated users
        const order = createOrder({
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          items,
          total: subtotal,
        });
        setPlacedOrderId(order.id);
        clearCart();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Order failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (placedOrderId) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-white px-6 py-16 text-center shadow-card">
        <CheckCircle2 className="mx-auto text-emerald-600" size={56} />
        <h2 className="mt-5 text-2xl font-black">Order Confirmed! 🎉</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Thank you for your order. We&apos;ll start working on your personalised items right away.
        </p>
        <p className="mt-4 font-black text-slate-950">{placedOrderId}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/orders-tracking" className="rounded-full bg-ikonnic-red px-5 py-3 text-sm font-black text-white">Track order</Link>
          <Link href="/account" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">My account</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <form onSubmit={submit} className="grid gap-7 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {!isAuthenticated && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">🔒 <Link href="/login" className="underline">Sign in</Link> for a faster checkout with saved addresses and order tracking.</p>
            </div>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-black">Customer details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Full name<input required name="name" defaultValue={user ? `${user.firstName} ${user.lastName || ""}`.trim() : ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red" /></label>
              <label className="text-xs font-bold text-slate-600">Email<input required type="email" name="email" defaultValue={user?.email || ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red" /></label>
              <label className="text-xs font-bold text-slate-600">Phone<input required type="tel" name="phone" defaultValue={user?.phone || ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red" /></label>
              <label className="text-xs font-bold text-slate-600">Coupon<input name="coupon" defaultValue={coupon ?? ""} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-ikonnic-red" /></label>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-black">Shipping address</h2>

            {/* Saved addresses (signed-in users) */}
            {isAuthenticated && savedAddresses.length > 0 && (
              <div className="mt-4 space-y-3">
                {savedAddresses.map((addr) => (
                  <label key={addr.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selectedAddressId === addr.id ? "border-ikonnic-red bg-red-50" : "border-slate-200"}`}>
                    <input type="radio" name="savedAddress" checked={selectedAddressId === addr.id} onChange={() => selectSavedAddress(addr)} className="mt-1 accent-ikonnic-red" />
                    <div>
                      <p className="text-sm font-black">
                        {addr.fullName}
                        {addr.isDefault && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-ikonnic-red">DEFAULT</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatAddress(addr)}</p>
                      <p className="mt-0.5 text-xs text-slate-400">📱 {addr.phone}</p>
                    </div>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${selectedAddressId === "new" ? "border-ikonnic-red bg-red-50" : "border-slate-200"}`}>
                  <input type="radio" name="savedAddress" checked={selectedAddressId === "new"} onChange={() => { setSelectedAddressId("new"); setPin(""); setCity(""); setStateName(""); setServiceability(null); }} className="accent-ikonnic-red" />
                  <p className="text-sm font-black">Use a new address</p>
                </label>
                {selectedAddressId !== "new" && serviceability?.serviceable && (
                  <p className="flex items-center gap-1 text-[11px] font-bold text-emerald-600"><Truck size={12} />Delivery in ~{serviceability.estimatedDays} days</p>
                )}
                {selectedAddressId !== "new" && serviceability && !serviceability.serviceable && (
                  <p className="text-[11px] font-bold text-red-600">Delivery not available for this address&apos;s pincode</p>
                )}
              </div>
            )}

            {/* Manual address form (guests, or "new address") */}
            {(selectedAddressId === "new" || savedAddresses.length === 0) && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600 sm:col-span-2">Street address<input required name="address" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red" /></label>
                <label className="text-xs font-bold text-slate-600">PIN code
                  <div className="relative">
                    <input required name="pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red" />
                    {loadingPin && <div className="absolute right-3 top-5 size-4 animate-spin rounded-full border-2 border-ikonnic-red border-t-transparent" />}
                  </div>
                  {serviceability && !serviceability.serviceable && pin.length === 6 && (
                    <p className="mt-1 text-[11px] font-bold text-red-600">Delivery not available for this pincode</p>
                  )}
                  {serviceability?.serviceable && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600"><Truck size={12} />Delivery in ~{serviceability.estimatedDays} days</p>
                  )}
                </label>
                <label className="text-xs font-bold text-slate-600">City<input required name="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red" /></label>
                <label className="text-xs font-bold text-slate-600">State<input required name="state" value={stateName} onChange={(e) => setStateName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-ikonnic-red" /></label>
                <label className="text-xs font-bold text-slate-600 sm:col-span-2">Country<select name="country" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-ikonnic-red"><option>India</option></select></label>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-black">Payment method</h2>
            <div className="mt-4 space-y-3">
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${paymentMethod === "RAZORPAY" ? "border-ikonnic-red bg-red-50" : "border-slate-200"}`}>
                <input type="radio" name="payment" value="RAZORPAY" checked={paymentMethod === "RAZORPAY"} onChange={() => setPaymentMethod("RAZORPAY")} className="accent-ikonnic-red" />
                <div><p className="text-sm font-black">Pay Online</p><p className="text-xs text-slate-500">UPI, Cards, Net Banking, Wallets (Razorpay)</p></div>
              </label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${paymentMethod === "COD" ? "border-ikonnic-red bg-red-50" : "border-slate-200"} ${serviceability?.codAvailable === false ? "opacity-50 pointer-events-none" : ""}`}>
                <input type="radio" name="payment" value="COD" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} disabled={serviceability?.codAvailable === false} className="accent-ikonnic-red" />
                <div><p className="text-sm font-black">Cash on Delivery</p><p className="text-xs text-slate-500">{serviceability?.codAvailable === false ? "Not available for this pincode" : "Pay when you receive your order"}</p></div>
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="font-black">Order summary</h2>
            <div className="mt-4 max-h-80 space-y-3 overflow-auto pr-1">
              {items.map((item) => (
                <div key={item.lineId} className="flex gap-3 border-b border-slate-100 pb-3">
                  <img src={item.previewImage || item.uploadedImagePreview || item.image} alt="" className="size-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{item.title}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Qty {item.quantity} · {item.selectedOptions?.size || "Standard"}</p>
                  </div>
                  <strong className="text-xs">₹{(item.finalTotal ?? item.price * item.quantity).toLocaleString("en-IN")}</strong>
                </div>
              ))}
            </div>
          </section>
          <CartSummary subtotal={subtotal} />
          <button
            type="submit"
            disabled={processing || (serviceability !== null && !serviceability.serviceable)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-ikonnic-red px-6 py-4 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
          >
            {processing ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} />}
            {processing ? "Processing..." : paymentMethod === "COD" ? "Place Order (COD)" : "Pay & Place Order"}
          </button>
          <p className="text-center text-xs font-semibold text-slate-500">Secure payments powered by Razorpay. 256-bit SSL encryption.</p>
        </div>
      </form>
    </>
  );
}
