import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Trash2, Camera } from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { useTranslation } from '@/lib/i18n/I18nContext'
import type { Locale } from '@/lib/i18n/translations'

interface ProfilePageProps {
  userId: string
  userEmail: string
}

const REMINDER_THRESHOLD_OPTIONS = [3, 5, 7, 10, 14]

export function ProfilePage({ userId, userEmail }: ProfilePageProps) {
  const { profile, loading, updateProfile, uploadAvatar, updatePassword, updateEmail, deleteAccount } = useProfile(userId, userEmail)
  const { t, locale, setLocale } = useTranslation()

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError]         = useState<string | null>(null)

  // Personal info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [infoDirty, setInfoDirty] = useState(false)
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoSaved, setInfoSaved]   = useState(false)
  const [infoError, setInfoError]   = useState<string | null>(null)

  // Email change
  const [newEmail, setNewEmail]       = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSent, setEmailSent]     = useState(false)
  const [emailError, setEmailError]   = useState<string | null>(null)

  // Password
  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdSaving, setPwdSaving]   = useState(false)
  const [pwdSaved, setPwdSaved]     = useState(false)
  const [pwdError, setPwdError]     = useState<string | null>(null)

  // Preferences (notifications + language)
  const [prefsSaving, setPrefsSaving] = useState(false)

  // Delete modal
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    const parts = (profile.fullName ?? '').trim().split(/\s+/)
    setFirstName(parts[0] ?? '')
    setLastName(parts.slice(1).join(' '))
    setInfoDirty(false)
  }, [profile])

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setInfoError(null)
    setInfoSaving(true)
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    const err = await updateProfile({ fullName })
    setInfoSaving(false)
    if (err) { setInfoError(err); return }
    setInfoSaved(true)
    setInfoDirty(false)
    setTimeout(() => setInfoSaved(false), 3000)
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdError(null)
    if (newPwd.length < 8) { setPwdError(t('settings.passwordTooShort')); return }
    if (newPwd !== confirmPwd) { setPwdError(t('settings.passwordMismatch')); return }
    setPwdSaving(true)
    const error = await updatePassword(newPwd)
    setPwdSaving(false)
    if (error) { setPwdError(error); return }
    setPwdSaved(true)
    setNewPwd('')
    setConfirmPwd('')
    setTimeout(() => setPwdSaved(false), 3000)
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed || trimmed === userEmail.toLowerCase()) {
      setEmailError(t('settings.newEmailRequired'))
      return
    }
    setEmailSaving(true)
    const error = await updateEmail(trimmed)
    setEmailSaving(false)
    if (error) { setEmailError(error); return }
    setEmailSent(true)
    setNewEmail('')
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarError(null)
    setAvatarUploading(true)
    const err = await uploadAvatar(file)
    setAvatarUploading(false)
    if (err) setAvatarError(err)
    e.target.value = ''
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    const error = await deleteAccount()
    setDeleting(false)
    if (error) { setDeleteError(error); return }
  }

  async function handleToggleReminders() {
    if (!profile) return
    setPrefsSaving(true)
    await updateProfile({ remindersEnabled: !profile.remindersEnabled })
    setPrefsSaving(false)
  }

  async function handleThresholdChange(days: number) {
    setPrefsSaving(true)
    await updateProfile({ reminderThresholdDays: days })
    setPrefsSaving(false)
  }

  async function handleLanguageChange(next: Locale) {
    setLocale(next)
    setPrefsSaving(true)
    await updateProfile({ language: next })
    setPrefsSaving(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }}>
        <Loader2 size={20} className="animate-spin" style={{ color: '#007EA7' }} />
      </div>
    )
  }

  return (
    <>
      <div style={{ width: '100%', padding: '32px 40px 80px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Header ── */}
        <div style={{ paddingBottom: 4 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#00171F', margin: 0, letterSpacing: '-0.03em' }}>
            {t('settings.title')}
          </h1>
          <p style={{ fontSize: 15, color: '#5B6B73', marginTop: 8, lineHeight: 1.5 }}>
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Personal Information ── */}
          <Card>
            <form onSubmit={handleSaveInfo}>
              <CardTitle>{t('settings.personalInfo')}</CardTitle>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 22, marginBottom: 4 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {/* Circle */}
                  <div style={{
                    width: 76, height: 76, borderRadius: '50%',
                    overflow: 'hidden', flexShrink: 0,
                    boxShadow: '0 0 0 2px #EEF2F4',
                  }}>
                    {profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt="Avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        background: '#003459',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 26, fontWeight: 700, userSelect: 'none',
                      }}>
                        {(firstName[0] ?? userEmail[0] ?? '?').toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Upload overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    aria-label={t('settings.changeAvatar')}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(0,23,31,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', cursor: avatarUploading ? 'wait' : 'pointer',
                      opacity: 0, transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    {avatarUploading
                      ? <Loader2 size={16} color="white" className="animate-spin" />
                      : <Camera size={16} color="white" />
                    }
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </div>

                <div>
                  <p style={{ fontSize: 15, fontWeight: 500, color: '#00171F', margin: 0 }}>
                    {[firstName, lastName].filter(Boolean).join(' ') || userEmail.split('@')[0]}
                  </p>
                  <p style={{ fontSize: 13, color: '#9AABB3', marginTop: 4 }}>
                    {t('settings.avatarHint')}
                  </p>
                  {avatarError && (
                    <p style={{ fontSize: 13, color: '#C64545', marginTop: 5 }}>{avatarError}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <InputField
                  label={t('settings.firstName')}
                  value={firstName}
                  onChange={v => { setFirstName(v); setInfoDirty(true) }}
                  placeholder={t('settings.firstNamePlaceholder')}
                  autoComplete="given-name"
                  required
                />
                <InputField
                  label={t('settings.lastName')}
                  value={lastName}
                  onChange={v => { setLastName(v); setInfoDirty(true) }}
                  placeholder={t('settings.lastNamePlaceholder')}
                  autoComplete="family-name"
                />
              </div>

              {infoError && <ErrorBanner message={infoError} />}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
                {infoSaved && <SuccessLabel text={t('settings.saved')} />}
                <PrimaryButton type="submit" loading={infoSaving} disabled={!infoDirty || infoSaving}>
                  {t('settings.save')}
                </PrimaryButton>
              </div>
            </form>
          </Card>

          {/* ── Email Address ── */}
          <Card>
              <form onSubmit={handleUpdateEmail}>
                <CardTitle>{t('settings.email')}</CardTitle>

                <div style={{ marginTop: 22 }}>
                  {/* Current email — readonly display */}
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>{t('settings.currentEmail')}</p>
                    <p style={{
                      height: 46, display: 'flex', alignItems: 'center',
                      padding: '0 16px', borderRadius: 12,
                      border: '1px solid #EEF2F4', background: '#F8FAFB',
                      fontSize: 14, color: '#7A8A92', fontFamily: 'Inter, sans-serif',
                    }}>
                      {userEmail}
                    </p>
                  </div>

                  <InputField
                    label={t('settings.newEmail')}
                    value={newEmail}
                    onChange={v => { setNewEmail(v); setEmailSent(false); setEmailError(null) }}
                    type="email"
                    placeholder={t('settings.newEmailPlaceholder')}
                    autoComplete="email"
                  />
                </div>

                {emailError && <ErrorBanner message={emailError} />}

                {emailSent && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    background: '#F0FDF4', color: '#166534',
                    border: '1px solid rgba(22,101,52,0.15)',
                    borderRadius: 10, padding: '12px 16px',
                    fontSize: 13, marginTop: 16, lineHeight: 1.6,
                  }}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      {t('settings.confirmationSentTo')} <strong>{newEmail || t('settings.yourNewAddress')}</strong>.
                      {' '}{t('settings.confirmationSentHint')}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
                  <PrimaryButton type="submit" loading={emailSaving} disabled={!newEmail.trim() || emailSaving}>
                    {t('settings.updateEmail')}
                  </PrimaryButton>
                </div>
              </form>
            </Card>

          {/* ── Security ── */}
          <Card>
              <form onSubmit={handleUpdatePassword}>
                <CardTitle>{t('settings.security')}</CardTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginTop: 22 }}>
                  <PwdField
                    label={t('settings.newPassword')}
                    value={newPwd}
                    show={showNew}
                    onToggle={() => setShowNew(v => !v)}
                    onChange={setNewPwd}
                    placeholder={t('settings.newPasswordPlaceholder')}
                    autoComplete="new-password"
                    showLabel={t('settings.showPassword')}
                    hideLabel={t('settings.hidePassword')}
                  />
                  <PwdField
                    label={t('settings.confirmNewPassword')}
                    value={confirmPwd}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(v => !v)}
                    onChange={setConfirmPwd}
                    placeholder={t('settings.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    showLabel={t('settings.showPassword')}
                    hideLabel={t('settings.hidePassword')}
                  />
                </div>

                {pwdError && <ErrorBanner message={pwdError} />}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
                  {pwdSaved && <SuccessLabel text={t('settings.passwordUpdated')} />}
                  <PrimaryButton type="submit" loading={pwdSaving} disabled={!newPwd || pwdSaving}>
                    {t('settings.updatePassword')}
                  </PrimaryButton>
                </div>
              </form>
            </Card>

          {/* ── Preferences: notifications + language ── */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

              {/* Notifications */}
              <div>
                <CardTitle>{t('settings.notifications')}</CardTitle>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginTop: 18 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#00171F', margin: 0 }}>
                      {t('settings.remindersEnabled')}
                    </p>
                    <p style={{ fontSize: 13, color: '#9AABB3', marginTop: 4, lineHeight: 1.5 }}>
                      {t('settings.remindersHint')}
                    </p>
                  </div>
                  <Toggle checked={profile?.remindersEnabled ?? true} onChange={handleToggleReminders} disabled={prefsSaving} />
                </div>

                {profile?.remindersEnabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
                    <span style={{ fontSize: 14, color: '#374151' }}>{t('settings.reminderThreshold')}</span>
                    <select
                      value={profile?.reminderThresholdDays ?? 7}
                      onChange={e => handleThresholdChange(Number(e.target.value))}
                      disabled={prefsSaving}
                      style={{
                        height: 38, padding: '0 12px', borderRadius: 10,
                        border: '1px solid #DCE3E8', background: '#fff',
                        fontSize: 14, color: '#00171F', fontFamily: 'Inter, sans-serif',
                        cursor: prefsSaving ? 'wait' : 'pointer',
                      }}
                    >
                      {REMINDER_THRESHOLD_OPTIONS.map(days => (
                        <option key={days} value={days}>{days}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 14, color: '#374151' }}>{t('settings.days')}</span>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: '#EEF2F4' }} />

              {/* Language */}
              <div>
                <CardTitle>{t('settings.language')}</CardTitle>
                <p style={{ fontSize: 13, color: '#9AABB3', marginTop: 6, marginBottom: 16, lineHeight: 1.5 }}>
                  {t('settings.languageHint')}
                </p>
                <div style={{ display: 'inline-flex', borderRadius: 12, border: '1px solid #DCE3E8', padding: 3, gap: 2 }}>
                  <LocaleButton active={locale === 'fr'} onClick={() => handleLanguageChange('fr')} disabled={prefsSaving}>
                    {t('settings.languageFr')}
                  </LocaleButton>
                  <LocaleButton active={locale === 'en'} onClick={() => handleLanguageChange('en')} disabled={prefsSaving}>
                    {t('settings.languageEn')}
                  </LocaleButton>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Danger Zone ── */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardTitle>{t('settings.dangerZone')}</CardTitle>
              <p style={{ fontSize: 14, color: '#5B6B73', lineHeight: 1.6, marginTop: 12 }}>
                {t('settings.dangerZoneText')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 20px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    cursor: 'pointer',
                    border: '1px solid rgba(224,90,90,0.22)',
                    background: 'rgba(224,90,90,0.06)',
                    color: '#C64545',
                    transition: 'background 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,90,90,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(224,90,90,0.06)')}
                >
                  <Trash2 size={14} />
                  {t('settings.deleteAccount')}
                </button>
              </div>
            </div>
          </Card>

        </div>

      </div>

      {/* ── Delete confirmation modal ── */}
      {showDelete && (
        <DeleteModal
          deleting={deleting}
          error={deleteError}
          onClose={() => setShowDelete(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #EEF2F4',
      borderRadius: 18,
      padding: 28,
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    }}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 18, fontWeight: 600, color: '#00171F', margin: 0, letterSpacing: '-0.01em' }}>
      {children}
    </h2>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 42, height: 24, borderRadius: 999, border: 'none', flexShrink: 0,
        background: checked ? '#003459' : '#DCE3E8',
        position: 'relative', cursor: disabled ? 'wait' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function LocaleButton({ active, onClick, disabled, children }: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '7px 16px',
        borderRadius: 9,
        border: 'none',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'Inter, sans-serif',
        cursor: disabled ? 'wait' : 'pointer',
        background: active ? '#003459' : 'transparent',
        color: active ? '#fff' : '#5B6B73',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function InputField({ label, value, onChange, placeholder, type = 'text', readonly, hint, autoComplete, required }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'url' | 'tel'
  readonly?: boolean
  hint?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readonly}
        autoComplete={autoComplete}
        required={required}
        style={{
          height: 46,
          padding: '0 16px',
          borderRadius: 12,
          border: '1px solid #DCE3E8',
          background: readonly ? '#F8FAFB' : '#fff',
          color: readonly ? '#7A8A92' : '#00171F',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          cursor: readonly ? 'not-allowed' : 'text',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => {
          if (!readonly) {
            e.currentTarget.style.borderColor = '#00A8E8'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,168,232,0.10)'
          }
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = '#DCE3E8'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {hint && <p style={{ fontSize: 12, color: '#9AABB3', margin: 0 }}>{hint}</p>}
    </div>
  )
}

function PwdField({ label, value, show, onToggle, onChange, placeholder, autoComplete, showLabel, hideLabel }: {
  label: string
  value: string
  show: boolean
  onToggle: () => void
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  showLabel: string
  hideLabel: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            height: 46,
            padding: '0 44px 0 16px',
            borderRadius: 12,
            border: '1px solid #DCE3E8',
            background: '#fff',
            color: '#00171F',
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#00A8E8'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,168,232,0.10)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = '#DCE3E8'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-label={show ? hideLabel : showLabel}
          style={{
            position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: '#9AABB3', display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#003459')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9AABB3')}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

function PrimaryButton({ children, type = 'button', loading, disabled, onClick }: {
  children: React.ReactNode
  type?: 'button' | 'submit'
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '10px 20px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: '#003459',
        color: '#fff',
        border: 'none',
        opacity: disabled ? 0.45 : 1,
        transition: 'background 0.15s, opacity 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = '#00263F' }}
      onMouseLeave={e => { e.currentTarget.style.background = '#003459' }}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#FEF2F2', color: '#991B1B',
      border: '1px solid rgba(220,38,38,0.15)',
      borderRadius: 10, padding: '10px 14px',
      fontSize: 13, marginTop: 14,
    }}>
      <AlertCircle size={14} style={{ flexShrink: 0 }} />
      {message}
    </div>
  )
}

function SuccessLabel({ text }: { text: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#059669', fontWeight: 500 }}>
      <CheckCircle2 size={14} />
      {text}
    </span>
  )
}

function DeleteModal({ onClose, onConfirm, deleting, error }: {
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
  error: string | null
}) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,23,31,0.35)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(224,90,90,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Trash2 size={18} color="#C64545" />
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#00171F', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          {t('settings.deleteModalTitle')}
        </h2>
        <p style={{ fontSize: 14, color: '#5B6B73', lineHeight: 1.6, margin: '0 0 28px' }}>
          {t('settings.deleteModalText')}
        </p>

        {error && <ErrorBanner message={error} />}

        <div style={{ display: 'flex', gap: 10, marginTop: error ? 16 : 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '11px 0',
              borderRadius: 12, fontSize: 14, fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              border: '1px solid #DCE3E8', background: '#fff',
              color: '#374151', cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFB')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1, padding: '11px 0',
              borderRadius: 12, fontSize: 14, fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              border: '1px solid rgba(224,90,90,0.25)',
              background: 'rgba(224,90,90,0.08)',
              color: '#C64545', cursor: deleting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
              opacity: deleting ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = 'rgba(224,90,90,0.14)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(224,90,90,0.08)' }}
          >
            {deleting && <Loader2 size={13} className="animate-spin" />}
            {t('settings.deleteAccount')}
          </button>
        </div>
      </div>
    </div>
  )
}
