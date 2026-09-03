import React, { useState, useEffect, useCallback } from 'react';
import {
  Store, Save, Lock, CheckCircle, Shield, MessageCircle, Send,
  RefreshCw, Check, Clock, Radio, Smartphone, AlertCircle, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'whatsapp' | 'security'

  // Store Settings
  const [shopSettings, setShopSettings] = useState({
    name: 'New Columbu Stores',
    address: 'Main Road, Krishnagiri, Tamil Nadu - 635001',
    mobile: '9876543200',
    gstin: '33AABCK1234A1Z5',
    state: 'Tamil Nadu',
    stateCode: '33',
    invoicePrefix: 'INV',
    invoiceNumber: 1,
  });
  const [savingShop, setSavingShop] = useState(false);

  // WhatsApp Automation Settings
  const [whatsAppSettings, setWhatsAppSettings] = useState({
    autoSendOnOrder: true,
    autoSendOnStatusChange: true,
    autoSendOnSale: true,
    autoSendOnPaymentDue: true,
    gatewayWebhookUrl: '',
    apiKey: '',
  });
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);

  // WhatsApp Logs
  const [whatsAppLogs, setWhatsAppLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Test WhatsApp
  const [testMobile, setTestMobile] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [shopRes, waRes] = await Promise.all([
        api.get('/settings').catch(() => ({ data: {} })),
        api.get('/whatsapp/settings').catch(() => ({ data: {} })),
      ]);
      if (shopRes.data.data?.shop) setShopSettings(shopRes.data.data.shop);
      if (waRes.data.data) setWhatsAppSettings(waRes.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadWhatsAppLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/whatsapp/logs?limit=15');
      setWhatsAppLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      loadWhatsAppLogs();
    }
  }, [activeTab, loadWhatsAppLogs]);

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

  const handleSaveWhatsApp = async (e) => {
    e.preventDefault();
    setSavingWhatsApp(true);
    try {
      await api.put('/whatsapp/settings', whatsAppSettings);
      toast.success('WhatsApp automation settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save WhatsApp settings');
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSendTestWhatsApp = async (e) => {
    e.preventDefault();
    const cleanPhone = testMobile.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return toast.error('Please enter a valid 10-digit mobile number');
    }

    setSendingTest(true);
    try {
      await api.post('/whatsapp/test', {
        mobile: cleanPhone,
        message: testMessage || undefined,
      });
      toast.success(`Automated test message dispatched to +91 ${cleanPhone}`);
      setTestMobile('');
      setTestMessage('');
      loadWhatsAppLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch test message');
    } finally {
      setSendingTest(false);
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
    <div className="page-container max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings size={22} className="text-primary-600" />
          <span>System & Store Settings</span>
        </h1>
        <p className="page-subtitle">Configure GST tax settings, WhatsApp automation triggers, and account security</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('store')}
          className={clsx(
            'px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'store'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <Store size={15} /> Store & GSTIN
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={clsx(
            'px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'whatsapp'
              ? 'bg-[#25D366] text-white shadow-xs'
              : 'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100'
          )}
        >
          <MessageCircle size={15} /> WhatsApp Automation
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={clsx(
            'px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === 'security'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <Lock size={15} /> Change Password
        </button>
      </div>

      {/* TAB 1: STORE & GSTIN */}
      {activeTab === 'store' && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Store size={20} className="text-primary-600" />
            <h2 className="font-bold text-base text-gray-900">Store Profile & GST Configuration</h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="form-input font-mono font-bold uppercase"
                  required
                  disabled={!isAdmin()}
                  value={shopSettings.gstin}
                  onChange={e => setShopSettings(s => ({ ...s, gstin: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
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
              <button type="submit" disabled={savingShop} className="btn-primary w-full py-3 mt-2 font-bold cursor-pointer">
                {savingShop ? 'Saving Store Settings...' : 'Save Store Settings'}
              </button>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: WHATSAPP AUTOMATION HUB */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          {/* Automation Triggers Configuration */}
          <div className="card p-6 border-2 border-green-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-green-100 text-green-700 rounded-xl flex items-center justify-center font-bold">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">Automated WhatsApp Messaging Engine</h2>
                  <p className="text-xs text-gray-500">Automatically dispatches WhatsApp messages without manual intervention</p>
                </div>
              </div>
              <span className="badge-green text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
            </div>

            <form onSubmit={handleSaveWhatsApp} className="space-y-5 pt-4">
              {/* Automation Toggles */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Automatic Trigger Rules:
                </p>

                {/* Toggle 1: New Orders */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={whatsAppSettings.autoSendOnOrder ?? true}
                    onChange={e => setWhatsAppSettings(s => ({ ...s, autoSendOnOrder: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <p className="font-bold text-sm text-gray-900">1. Instant Order Confirmation</p>
                    <p className="text-xs text-gray-500">
                      Automatically sends order summary and store greeting to customer mobile immediately when an order is placed.
                    </p>
                  </div>
                </label>

                {/* Toggle 2: Order Status Updates */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={whatsAppSettings.autoSendOnStatusChange ?? true}
                    onChange={e => setWhatsAppSettings(s => ({ ...s, autoSendOnStatusChange: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <p className="font-bold text-sm text-gray-900">2. Order Status Alerts (Ready / Out for Delivery / Delivered)</p>
                    <p className="text-xs text-gray-500">
                      Automatically alerts customers when their grocery order is packed, ready for pickup, or out for delivery.
                    </p>
                  </div>
                </label>

                {/* Toggle 3: POS Billing Receipts */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100/80 transition-colors">
                  <input
                    type="checkbox"
                    checked={whatsAppSettings.autoSendOnSale ?? true}
                    onChange={e => setWhatsAppSettings(s => ({ ...s, autoSendOnSale: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <p className="font-bold text-sm text-gray-900">3. POS Digital Invoice Receipt</p>
                    <p className="text-xs text-gray-500">
                      Automatically dispatches a digital itemized receipt when billing a customer with a mobile number at the POS counter.
                    </p>
                  </div>
                </label>
              </div>

              {/* Gateway Configuration (Optional) */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  WhatsApp Webhook Gateway (Optional):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="form-label">Gateway Webhook URL</label>
                    <input
                      className="form-input"
                      placeholder="https://api.ultramsg.com/... or Meta Cloud API"
                      value={whatsAppSettings.gatewayWebhookUrl || ''}
                      onChange={e => setWhatsAppSettings(s => ({ ...s, gatewayWebhookUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">API Key / Token</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Enter API Key / Token"
                      value={whatsAppSettings.apiKey || ''}
                      onChange={e => setWhatsAppSettings(s => ({ ...s, apiKey: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingWhatsApp}
                className="btn bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold w-full py-3 shadow-md cursor-pointer text-xs"
              >
                {savingWhatsApp ? 'Saving Automation Settings...' : 'Save WhatsApp Automation Rules'}
              </button>
            </form>
          </div>

          {/* Test Dispatcher & Live Automation Log */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Test WhatsApp Trigger */}
            <div className="lg:col-span-5 card p-5 space-y-4 border border-gray-200">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Send size={16} className="text-green-600" />
                <h3 className="font-bold text-sm text-gray-900">Send Test WhatsApp Message</h3>
              </div>

              <form onSubmit={handleSendTestWhatsApp} className="space-y-3 text-xs">
                <div>
                  <label className="form-label">Recipient Mobile Number *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      className="form-input pl-11 py-2 font-semibold"
                      placeholder="98765 43210"
                      value={testMobile}
                      onChange={e => setTestMobile(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Custom Message (Optional)</label>
                  <textarea
                    rows={3}
                    className="form-input text-xs"
                    placeholder="Leave blank to send default greeting..."
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingTest || testMobile.length !== 10}
                  className="btn bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold w-full py-2.5 shadow-xs cursor-pointer text-xs gap-1.5"
                >
                  <Send size={13} />
                  <span>{sendingTest ? 'Dispatching...' : 'Dispatch Test WhatsApp'}</span>
                </button>
              </form>
            </div>

            {/* Live Automated Messages Log */}
            <div className="lg:col-span-7 card p-5 space-y-4 border border-gray-200">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-primary-600" />
                  <h3 className="font-bold text-sm text-gray-900">Live Automated Messages Log</h3>
                </div>
                <button
                  onClick={loadWhatsAppLogs}
                  disabled={loadingLogs}
                  className="btn-outline btn-sm p-1 text-xs cursor-pointer"
                  title="Refresh Log"
                >
                  <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {loadingLogs ? (
                  <div className="py-8 text-center text-xs text-gray-400">Loading messages...</div>
                ) : whatsAppLogs.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs">
                    No automated messages sent yet. Place an order or send a test message above!
                  </div>
                ) : (
                  whatsAppLogs.map(log => (
                    <div key={log._id} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{log.customerName}</span>
                          <span className="text-[11px] text-gray-500 font-mono">+91 {log.recipientMobile}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800 uppercase inline-flex items-center gap-1">
                          <Check size={11} />
                          <span>{log.status}</span>
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-600 bg-white p-2 rounded-lg border border-gray-100 whitespace-pre-line max-h-20 overflow-y-auto">
                        {log.messageText}
                      </p>

                      <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
                        <span className="font-semibold uppercase tracking-wider text-primary-700">
                          Template: {log.template?.replace(/_/g, ' ')}
                        </span>
                        <span>{new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHANGE PASSWORD */}
      {activeTab === 'security' && (
        <div className="card p-6 max-w-xl">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
            <Lock size={20} className="text-primary-600" />
            <h2 className="font-bold text-base text-gray-900">Change Account Password</h2>
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

            <button type="submit" disabled={savingPassword} className="btn-secondary w-full py-3 mt-4 font-bold cursor-pointer">
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
