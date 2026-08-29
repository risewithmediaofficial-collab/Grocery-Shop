import React, { useState, useEffect } from 'react';
import { Store, Save, Lock, CheckCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [shopSettings, setShopSettings] = useState({
    name: 'New Kolambu Stores',
    address: 'Main Road, Krishnagiri, Tamil Nadu - 635001',
    mobile: '9876543200',
    gstin: '33AABCK1234A1Z5',
    state: 'Tamil Nadu',
    stateCode: '33',
    invoicePrefix: 'KS',
    invoiceNumber: 1,
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingShop, setSavingShop] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(res => {
        if (res.data.data?.shop) setShopSettings(res.data.data.shop);
      })
      .catch(console.error);
  }, []);

  const handleSaveShop = async (e) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      await api.put('/settings/shop', { value: shopSettings });
      toast.success('Store & GST settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingShop(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('New passwords do not match');
    }
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="page-container max-w-4xl">
      <div>
        <h1 className="page-title">Admin & Store Settings</h1>
        <p className="page-subtitle">Configure GST tax settings, print invoice headers, and staff security</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store & GST Configuration */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Store size={20} className="text-primary-600" />
            <h2 className="font-bold text-base text-gray-900">Store Profile & GSTIN</h2>
          </div>

          <form onSubmit={handleSaveShop} className="space-y-4 text-xs">
            <div>
              <label className="form-label">Store / Business Name *</label>
              <input
                className="form-input"
                required
                disabled={!isAdmin()}
                value={shopSettings.name}
                onChange={e => setShopSettings(s => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Store Address *</label>
              <input
                className="form-input"
                required
                disabled={!isAdmin()}
                value={shopSettings.address}
                onChange={e => setShopSettings(s => ({ ...s, address: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Store Phone</label>
                <input
                  className="form-input"
                  disabled={!isAdmin()}
                  value={shopSettings.mobile}
                  onChange={e => setShopSettings(s => ({ ...s, mobile: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Store GSTIN *</label>
                <input
                  className="form-input font-mono font-bold"
                  required
                  disabled={!isAdmin()}
                  value={shopSettings.gstin}
                  onChange={e => setShopSettings(s => ({ ...s, gstin: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">State Name</label>
                <input
                  className="form-input"
                  disabled={!isAdmin()}
                  value={shopSettings.state}
                  onChange={e => setShopSettings(s => ({ ...s, state: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">State GST Code</label>
                <input
                  className="form-input"
                  disabled={!isAdmin()}
                  value={shopSettings.stateCode}
                  onChange={e => setShopSettings(s => ({ ...s, stateCode: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <div>
                <label className="form-label">Invoice Prefix</label>
                <input
                  className="form-input font-bold"
                  disabled={!isAdmin()}
                  value={shopSettings.invoicePrefix}
                  onChange={e => setShopSettings(s => ({ ...s, invoicePrefix: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Next Sequence #</label>
                <input
                  type="number"
                  className="form-input"
                  disabled={!isAdmin()}
                  value={shopSettings.invoiceNumber}
                  onChange={e => setShopSettings(s => ({ ...s, invoiceNumber: Number(e.target.value) }))}
                />
              </div>
            </div>

            {isAdmin() && (
              <button type="submit" disabled={savingShop} className="btn-primary w-full py-2.5 mt-2">
                {savingShop ? 'Saving...' : 'Save Store Settings'}
              </button>
            )}
          </form>
        </div>

        {/* Change Password */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Lock size={20} className="text-primary-600" />
            <h2 className="font-bold text-base text-gray-900">Change Your Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="form-label">Current Password *</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="Minimum 6 characters"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Confirm New Password *</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>

            <button type="submit" disabled={savingPassword} className="btn-secondary w-full py-2.5 mt-4">
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
