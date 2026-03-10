'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import {
    cancelGiftCertificate,
    issueGiftCertificate,
    listCouponDefinitions,
    listGiftCertificates,
    redeemGiftCertificate,
    upsertCouponDefinition,
    type CouponDefinition,
    type GiftCertificate
} from '@/lib/crm/api';

const emptyCoupon = { couponDefinitionId: '', couponCode: 'WELCOME10', name: 'Welcome 10%', benefitType: 'DISCOUNT', valueAmount: '', valuePercent: '10.00', minimumInvoiceAmount: '0.00', validFromText: '', validToText: '', usageLimit: 1, isActive: true, metadataJson: '{\n  "audiences": ["retail", "agency", "textile"]\n}' };
const emptyGift = { certificateCode: '', couponDefinitionId: '', recipientLedgerId: '', issuedToName: '', issuedToPhone: '', issuedAmount: '500.00', issuedOnText: '', expiresOnText: '', notes: '', metadataJson: '{\n  "source": "giftcoupon-app"\n}' };
const emptyRedeem = { giftCertificateId: '', redeemedAmount: '0.00', notes: '' };

export default function GiftCouponAppPage() {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [couponForm, setCouponForm] = React.useState(emptyCoupon);
    const [giftForm, setGiftForm] = React.useState(emptyGift);
    const [redeemForm, setRedeemForm] = React.useState(emptyRedeem);
    const [coupons, setCoupons] = React.useState<CouponDefinition[]>([]);
    const [gifts, setGifts] = React.useState<GiftCertificate[]>([]);

    const loadPage = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [nextCoupons, nextGifts] = await Promise.all([listCouponDefinitions(), listGiftCertificates()]);
            setCoupons(nextCoupons);
            setGifts(nextGifts);
            if (nextCoupons[0]) setGiftForm((current) => ({ ...current, couponDefinitionId: current.couponDefinitionId || nextCoupons[0].id }));
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to load gift coupon app');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { void loadPage(); }, [loadPage]);

    const save = React.useCallback(async (work: () => Promise<void>, success: string) => {
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            await work();
            await loadPage();
            setNotice(success);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    }, [loadPage]);

    const couponOptions = coupons.map((coupon) => ({ label: `${coupon.name} (${coupon.couponCode})`, value: coupon.id }));

    return (
        <div className="grid">
            <div className="col-12 xl:col-4">
                <div className="card flex flex-column gap-3">
                    <div>
                        <h2 className="mb-2">Gift Coupon</h2>
                        <p className="text-600 mb-0">Separate app surface over shared CRM benefit APIs for coupon setup and gift certificate issue/redeem.</p>
                    </div>
                    {error ? <Message severity="error" text={error} /> : null}
                    {notice ? <Message severity="success" text={notice} /> : null}
                    <Button label="Reload" text onClick={() => void loadPage()} disabled={loading || saving} />
                    <div>
                        <div className="text-700 font-medium mb-2">Coupons</div>
                        <div className="flex flex-column gap-2">{coupons.map((coupon) => <button key={coupon.id} type="button" className="p-0 border-none bg-transparent text-left cursor-pointer" onClick={() => setCouponForm({ ...emptyCoupon, ...coupon, couponDefinitionId: coupon.id, usageLimit: coupon.usageLimit ?? 1, metadataJson: coupon.metadataJson || emptyCoupon.metadataJson })}><div className="surface-border border-1 border-round p-3"><div className="flex align-items-center justify-content-between"><span className="font-medium">{coupon.name}</span><Tag value={coupon.benefitType} severity="info" /></div><div className="text-600 text-sm">{coupon.couponCode}</div></div></button>)}</div>
                    </div>
                    <div>
                        <div className="text-700 font-medium mb-2">Gift Certificates</div>
                        <div className="flex flex-column gap-2">{gifts.map((gift) => <button key={gift.id} type="button" className="p-0 border-none bg-transparent text-left cursor-pointer" onClick={() => setRedeemForm({ giftCertificateId: gift.id, redeemedAmount: gift.balanceAmount, notes: gift.notes || '' })}><div className="surface-border border-1 border-round p-3"><div className="flex align-items-center justify-content-between"><span className="font-medium">{gift.certificateCode}</span><Tag value={gift.status} severity={gift.status === 'active' ? 'success' : 'warning'} /></div><div className="text-600 text-sm">Balance {gift.balanceAmount}</div></div></button>)}</div>
                    </div>
                </div>
            </div>
            <div className="col-12 xl:col-8 flex flex-column gap-3">
                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Coupon Definition</h3>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Code</label><AppInput value={couponForm.couponCode} onChange={(e) => setCouponForm((s) => ({ ...s, couponCode: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Name</label><AppInput value={couponForm.name} onChange={(e) => setCouponForm((s) => ({ ...s, name: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Benefit type</label><AppInput value={couponForm.benefitType} onChange={(e) => setCouponForm((s) => ({ ...s, benefitType: e.target.value }))} disabled={saving} /></div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Value amount</label><AppInput value={couponForm.valueAmount} onChange={(e) => setCouponForm((s) => ({ ...s, valueAmount: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Value percent</label><AppInput value={couponForm.valuePercent} onChange={(e) => setCouponForm((s) => ({ ...s, valuePercent: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4 flex align-items-end gap-2"><InputSwitch checked={couponForm.isActive} onChange={(e) => setCouponForm((s) => ({ ...s, isActive: !!e.value }))} /><span>Active</span></div>
                    </div>
                    <div><label className="block text-700 mb-2">Metadata JSON</label><InputTextarea rows={5} className="w-full font-mono text-sm" value={couponForm.metadataJson} onChange={(e) => setCouponForm((s) => ({ ...s, metadataJson: e.target.value }))} disabled={saving} /></div>
                    <div className="flex gap-2"><Button label="Save Coupon" loading={saving} onClick={() => void save(async () => { await upsertCouponDefinition(couponForm); }, 'Coupon definition saved.')} /></div>
                </div>

                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Issue Gift Certificate</h3>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Certificate code</label><AppInput value={giftForm.certificateCode} onChange={(e) => setGiftForm((s) => ({ ...s, certificateCode: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Coupon definition</label><AppDropdown value={giftForm.couponDefinitionId} options={couponOptions} onChange={(e) => setGiftForm((s) => ({ ...s, couponDefinitionId: e.value ?? '' }))} className="w-full" disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Issued amount</label><AppInput value={giftForm.issuedAmount} onChange={(e) => setGiftForm((s) => ({ ...s, issuedAmount: e.target.value }))} disabled={saving} /></div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Recipient ledger</label><AppInput value={giftForm.recipientLedgerId} onChange={(e) => setGiftForm((s) => ({ ...s, recipientLedgerId: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Issued to</label><AppInput value={giftForm.issuedToName} onChange={(e) => setGiftForm((s) => ({ ...s, issuedToName: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Phone</label><AppInput value={giftForm.issuedToPhone} onChange={(e) => setGiftForm((s) => ({ ...s, issuedToPhone: e.target.value }))} disabled={saving} /></div>
                    </div>
                    <div className="flex gap-2"><Button label="Issue Certificate" loading={saving} onClick={() => void save(async () => { await issueGiftCertificate(giftForm); setGiftForm(emptyGift); }, 'Gift certificate issued.')} /></div>
                </div>

                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Redeem or Cancel</h3>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Gift certificate ID</label><AppInput value={redeemForm.giftCertificateId} onChange={(e) => setRedeemForm((s) => ({ ...s, giftCertificateId: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Redeem amount</label><AppInput value={redeemForm.redeemedAmount} onChange={(e) => setRedeemForm((s) => ({ ...s, redeemedAmount: e.target.value }))} disabled={saving} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Notes</label><AppInput value={redeemForm.notes} onChange={(e) => setRedeemForm((s) => ({ ...s, notes: e.target.value }))} disabled={saving} /></div>
                    </div>
                    <div className="flex gap-2 flex-wrap"><Button label="Redeem" loading={saving} onClick={() => void save(async () => { await redeemGiftCertificate(redeemForm); }, 'Gift certificate redeemed.')} /><Button label="Cancel Certificate" text onClick={() => void save(async () => { await cancelGiftCertificate({ giftCertificateId: redeemForm.giftCertificateId, notes: redeemForm.notes }); }, 'Gift certificate cancelled.')} disabled={!redeemForm.giftCertificateId || saving} /></div>
                </div>
            </div>
        </div>
    );
}
