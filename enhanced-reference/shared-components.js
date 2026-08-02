// Shared Components for Jawwal Pay Business
// Reusable HTML component generators

function renderUtilityBar() {
  return `
<!-- Utility bar -->
<div class="utility-bar">
  <div class="wrap">
    <div class="utility-links">
      <a href="tel:1177"><img class="ic" src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTEuMyA0MDIiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojOGVjMTZmO308L3N0eWxlPjwvZGVmcz48dGl0bGU+bW9iaWxlLWFsdC1zb2xpZF9uPC90aXRsZT48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yMTMuNSwwSDM3LjdBMzcuNzQsMzcuNzQsMCwwLDAsMCwzNy43VjM2NC4zQTM3Ljc0LDM3Ljc0LDAsMCwwLDM3LjcsNDAySDIxMy42YTM3Ljc0LDM3Ljc0LDAsMCwwLDM3LjctMzcuN1YzNy43QTM3Ljg4LDM3Ljg4LDAsMCwwLDIxMy41LDBaTTEyNi4zLDM4OS42YTIzLjQ3LDIzLjQ3LDAsMSwxLC4wNiwwWm04Ny4yLTcyYTE3LDE3LDAsMCwxLTE3LDE3SDU0LjlhMTcsMTcsMCwwLDEtMTctMTdWMjk0LjFhNi40Miw2LjQyLDAsMCwxLS4yLTJWNDcuMWE5LjM4LDkuMzgsMCwwLDEsOS4zOC05LjRoMTU3YTkuMzgsOS4zOCwwLDAsMSw5LjQsOS4zOFYzMTcuNloiLz48L3N2Zz4=">1177</a>
      <a href="mailto:sales@jawwalpay.ps"><img class="ic" src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMjUuNCAyNDQiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojOGVjMTZmO308L3N0eWxlPjwvZGVmcz48dGl0bGU+ZW52ZWxvcGUtcmVndWxhci0wMV9nX0U8L3RpdGxlPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTI5NC45LDBIMzAuNUEzMC41NiwzMC41NiwwLDAsMCwwLDMwLjV2MTgzQTMwLjU2LDMwLjU2LDAsMCwwLDMwLjUsMjQ0SDI5NC45YTMwLjU2LDMwLjU2LDAsMCwwLDMwLjUtMzAuNVYzMC41QTMwLjQ5LDMwLjQ5LDAsMCwwLDI5NC45MiwwWk0xMDcsMTU2LjFjMTQuMiwxMS44LDM0LDI3LDU1LjcsMjYuOSwyMS43LjEsNDEuNC0xNS4xLDU1LjctMjYuOUwyNzYsMjEzLjVINDkuNFptMTMyLjQtMTYuOGMyNS4zLTE5LjgsNDIuOC0zMy42LDU1LjUtNDMuOHY5OS4xWk0zMC41LDMwLjVIMjk0LjlWNTYuNGMtMTQuMiwxMS42LTM3LDI5LjctODUuNSw2Ny43LTEwLjcsOC40LTMxLjksMjguNy00Ni42LDI4LjQtMTQuNy4zLTM2LTIwLTQ2LjYtMjguNEM2Ny42LDg2LjEsNDQuOSw2OCwzMC43LDU2LjRWMzAuNVpNODYsMTM5LjMsMzAuNSwxOTQuN1Y5NS42QzQzLjMsMTA1LjcsNjAuNywxMTkuNSw4NiwxMzkuM1oiLz48L3N2Zz4=">أرسل ملاحظات</a>
      <a href="#"><img class="ic" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAFelJREFUeJztnXucFNWVx3/nVs0wwMCALjEadOMTo0aNZo1RmEcgMZpEzUM0xhDM7gddcaa7Z1TUTzCliYjATPf0oBtM9hM3muhi3JU81CxgT/cgGoMP8hJw15gERcTwfk533bN/dJugoe+9VV3V3QP9/bdOnXtm6tdV93HuuUCNGjVq1KhRo0aNGjUOLajSAZSLuUtnNY2wd4+SdWJkjrnRyllj2XJHAgC51i7XdrfYRDtFVu7anRux4+ZP3r2t0jGXg4NKAA47YmT/5lME0YdAdBIxn8yECQScBKDJo7ttAK8FibXMWAvmdWSL328/v+llhxwZRvyVYMgLID4QOw7SnQKiKcxoA/APITf5NhjPMmEFC17WNTH5AhE45DZDY8gJgBmUGIiex4xpAF8M4P0VDmkDgCUMfqCzOfnMUBPDkBFAd7rzaMC9koB/BnBipeMpwp8IeIil+F5nW/x/Kx2MCVUvgHgqNoWFvAVAG4ZAvAUYwFMEmhNrSTxV6WBUVO0/tPDgvwXg3ErHUiIvMuOuzpbeH1fj56HqBBDPRC9l5tsBnF7pWAKFaTUT39bV0vuTSoeyP1UjgHnL24+3bdEH4MKQmhgEsAmMnUTYycBWgHbmL3EjAWOY0QhCI4BxAOpDiuPnJERHbFL81ZD8e6LiAnBS0xuaxOhZDLoZQEMALiWA1QD9CuB1RLSGXVq7HU2vOW1Oziwmxx4rNh+bEzSBJCYAdBLA5yD/VhIBxLiHiO+ydvK8jov69gXgzzcVFcCCVGSiEPg+gBNKdPUygOUEStVls+nrp9zzlwDC+zsWLpt5+L56uxXMbQSaDODkEl2+wuDpXS3JlUHE54eKCIAZFM90dAA0H0CdTzcbADxCRP8Ra068EGB4xvSsiJ1KrvwqA9MAHOnTTY5Bd+5oHnNHJWYYyy6AZKZ9XA7iB2B82sftEsASSL5v/KYNS6dOfcQNOj4/LF58mfX6+z7wKQmeQYRL4O//+riU9tduaOt+O+j4VJRVAIVX/sMAPuDx1hwYD0sh77qhue/3YcQWFPNTHadZgm4BcDkAy+Pt6xl8eTk/CWUTQHcm8kVi/BDAMA+3SQDfJyHmVEuv2ZR5y9uPr7PEN5gwDd46jnvBfGVna/K/w4ptf8oigO5MdDoxfxeA7eG2l4jpulhr4pmw4ioHCwY6zhYS9wJ0jofbXAZmdrX0LgotsAKhC6A7HZlFwFwPt2wD+JvjN25YWC3f+FJx2BFNmc3/wqB58LAsTcDdsZbem0MMLVwBxNOROANR8zsonbVyV86auPCN8KKqHMlU+/icoB8BNMn4Jka8s7W3M6yYgpjUOCDxdMc3PTx8BpAcOXL3Jw/Whw8AHW1968dv3NDGoNuR79/oIcR60pFvhBVTKG+A7nTkGgK+Y2i+kaS4KtYWXxZGLNVKIhO5QDIeQH7aWQszZnS19n436DgCF0BPpuMSMD0KsyHQq5DigqGydh4089PXH2tBPJmfatbiEtEVsebEj4OMIVABFMb5y2Aw1CPg+Zxdd9GN5y94K8gYhhqJZZEjZB0eB3CWgfleBk8Ocp4gMAEkM+3jcixehNkkT8oeJi/tOLdve1DtD2XuSV3XuE/UPwrwpwzM10tpfySoGcNAOoEOOyIH8QOYPHziZfYueWHt4f+NmW337rR3uRcDMMkeGi9E7n7mYH68gQhg1MDWWYZz+6uyouELlV4CrUY6Lurbl7WGXQrAZGHrM/GByA1BtFuyigrf/RS0s3y8zrXrJx3q33wdiWWRI7geTzPjeI1plsGtpfYHShKAk5reMFo0/Qb69fyNJOn...[5718 bytes truncated]">English</a>
    </div>
    <div class="app-links">
      <span>حمّل التطبيق</span>
      <a href="#" aria-label="Android"><img src="data:image/svg+xml;base64,PHN2ZyBpZD0iQ2FwYV8xIiBkYXRhLW5hbWU9IkNhcGEgMSIgeG1sbnM9Imh0cHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNDA1LjMzIDUxMi4wNCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiNmZmY7fS5jbHMtMntmaWxsOiNmY2ZjZmM7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5hbmRyb2lkX3c8L3RpdGxlPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTM2Mi42OCwxOTJIMTQ5LjM1YTEwLjY3LDEwLjY3LDAsMCwwLTEwLjY3LDEwLjY3VjM3My4zN2E1My40Miw1My40MiwwLDAsMCw0Mi42Nyw1Mi4yNlY0ODBhMzIsMzIsMCwwLDAsNjQsMFY0MjYuN2gyMS4zM1Y0ODBhMzIsMzIsMCwwLDAsNjQsMHYtNTQuNGE1My40LDUzLjQsMCwwLDAsNDIuNjctNTIuMjZWMjAyLjdBMTAuNjYsMTAuNjYsMCwwLDAsMzYyLjY4LDE5MloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC01My4zNSAwKSIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTMxMS44NSw1Ni44NWwxOC00MkExMC42NiwxMC42NiwwLDAsMCwzMTAuMjIsNi41bC0xOCw0MmExMTYuMjgsMTE2LjI4LDAsMCwwLTcyLjQxLDBsLTE4LTQyYTEwLjY1LDEwLjY1LDAsMSwwLTE5LjU4LDguMzhsMTgsNDJBMTE3LjQsMTE3LjQsMCwwLDAsMTM4LjY4LDE2MGExMC42NywxMC42NywwLDAsMCwxMC42NywxMC42N0gzNjIuNjhBMTAuNjcsMTAuNjcsMCwwLDAsMzczLjM1LDE2MCwxMTcuNDMsMTE3LjQzLDAsMCwwLDMxMS44NSw1Ni44NVpNMjEzLjM1LDEyOEExMC42NywxMC42NywwLDEsMSwyMjQsMTE3LjM3LDEwLjY3LDEwLjY3LDAsMCwxLDIxMy4zNSwxMjhabTg1LjMzLDBhMTAuNjcsMTAuNjcsMCwxLDEsMTAuNjctMTAuNjZBMTAuNjcsMTAuNjcsMCwwLDEsMjk4LjY4LDEyOFoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC01My4zNSAwKSIvPjxwYXRoIGNsYXNzPSJjbHMtMiIgZD0iTTQyNi42OCwxOTJhMzIsMzIsMCwwLDAtMzIsMzJWMzMwLjdhMzIsMzIsMCwwLDAsNjQsMFYyMjRBMzIsMzIsMCwwLDAsNDI2LjY4LDE5MloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC01My4zNSAwKSIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTg1LjM1LDE5MmEzMiwzMiwwLDAsMC0zMiwzMlYzMzAuN2EzMiwzMiwwLDAsMCw2NCwwVjIyNEEzMiwzMiwwLDAsMCw4NS4zNSwxOTJaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNTMuMzUgMCkiLz48L3N2Zz4="></a>
      <a href="#" aria-label="Apple"><img src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMzE0LjQiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojZmZmO308L3N0eWxlPjwvZGVmcz48dGl0bGU+YXBwbGVfdzwvdGl0bGU+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjEzLjgsMTY3Yy40NSw0Ny41OCw0MS43NCw2My40MSw0Mi4yLDYzLjYxYTE3MiwxNzIsMCwwLDEtMjEuNzYsNDQuNzJjLTEzLjEsMTkuMTUtMjYuNywzOC4yNC00OC4xMywzOC42My0yMS4wNS4zOS0yNy44Mi0xMi40OC01MS44OS0xMi40OHMtMzEuNTgsMTIuMDktNTEuNSwxMi44N2MtMjAuNjguNzgtMzYuNDMtMjAuNzEtNDkuNjUtMzkuNzktMjctMzktNDcuNjMtMTEwLjMtMTkuOTItMTU4LjQxLDEzLjc2LTIzLjg5LDM4LjM2LTM5LDY1LjA1LTM5LjQsMjAuMzEtLjM5LDM5LjQ4LDEzLjY2LDUxLjg5LDEzLjY2czM1LjctMTYuOSw2MC4xOS0xNC40MmMxMC4yNS40MywzOSw0LjE0LDU3LjUsMzEuMTktMS40OS45Mi0zNC4zMywyMC0zNCw1OS44Mk0xNzQuMjQsNTAuMmMxMS0xMy4yOSwxOC4zNy0zMS43OSwxNi4zNS01MC4yLTE1LjgyLjY0LTM1LDEwLjU1LTQ2LjMxLDIzLjgzQzEzNC4xMSwzNS41OSwxMjUuMiw1NC40MiwxMjcuNiw3Mi40NmMxNy42NCwxLjM3LDM1LjY2LTksNDYuNjQtMjIuMjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDApIi8+PC9zdmc+"></a>
    </div>
  </div>
</div>`;
}

function renderHeader() {
  return `
<!-- Main header -->
<header class="main-header">
  <div class="wrap">
    <div class="brand">
      <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgd2lkdGg9IjQ1MHB4IiBoZWlnaHQ9IjQ1MHB4IiBzdHlsZT0ic2hhcGUtcmVuZGVyaW5nOmdlb21ldHJpY1ByZWNpc2lvbjsgdGV4dC1yZW5kZXJpbmc6Z2VvbWV0cmljUHJlY2lzaW9uOyBpbWFnZS1yZW5kZXJpbmc6b3B0aW1pemVRdWFsaXR5OyBmaWxsLXJ1bGU6ZXZlbm9kZDsgY2xpcC1ydWxlOmV2ZW5vZGUiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIj4KPGc+PHBhdGggc3R5bGU9Im9wYWNpdHk6MC45NjkiIGZpbGw9IiNmZGZlZmMiIGQ9Ik0gMjQ4LjUsNjQuNSBDIDI4MC4zNjcsNjEuNjkxNyAzMDYuMiw3Mi42OTE3IDMyNiw5Ny41QyAzMzUuNzE3LDExMS45ODMgMzQxLjA1LDEyNy45ODMgMzQyLDE0NS41QyAzNzEuNTExLDE2Ni4yMDIgMzgzLjg0NCwxOTQuNTM2IDM3OSwyMzAuNUMgMzcwLjc1MiwyNjUuNzQ4IDM0OC45MTksMjg3LjI0OCAzMTMuNSwyOTVDIDI5NS4zNjUsMjk3LjI4MSAyNzcuNjk5LDI5NS4xMTQgMjYwLjUsMjg4LjVDIDIzMy40MjcsMjk5Ljc0MyAyMDYuNzYsMjk4LjkwOSAxODAuNSwyODZDIDE0MS45MDQsMjYwLjU0MiAxMzAuNzM3LDIyNi4wNDIgMTQ3LDE4Mi41QyAxNTMuNzY4LDE2Ny44OTcgMTYzLjkzNSwxNTYuMjMgMTc3LjUsMTQ3LjVDIDE4MC44NzQsMTAyLjE0NyAyMDQuNTQxLDc0LjQ4MDYgMjQ4LjUsNjQuNSBaIi8+PC9nPgo8Zz48cGF0aCBzdHlsZT0ib3BhY2l0eToxIiBmaWxsPSIjNzdiYzIzIiBkPSJNIDI0OC41LDc4LjUgQyAyODIuNTYzLDc1LjQzOTUgMzA3LjA2Myw4OS4xMDYyIDMyMiwxMTkuNUMgMzI2LjIxNiwxMzAuMTI3IDMyNy41NSwxNDEuMTI3IDMyNiwxNTIuNUMgMzIzLjQwOSwxNzIuMTkzIDMxOS4yNDMsMTkxLjUyNyAzMTMuNSwyMTAuNUMgMjk3LjU0MiwyMDYuNTE1IDI4MS44NzYsMjAxLjUxNSAyNjYuNSwxOTUuNUMgMjY1LjUsMTc2LjUxMiAyNjUuMTY3LDE1Ny41MTIgMjY1LjUsMTM4LjVDIDI0MC44MywxMzcuOTE2IDIxNi44MywxNDEuNTgzIDE5My41LDE0OS41QyAxOTMuODA4LDExMS44OSAyMTIuMTQxLDg4LjIyMzcgMjQ4LjUsNzguNSBaIi8+PC9nPgo8Zz48cGF0aCBzdHlsZT0ib3BhY2l0eToxIiBmaWxsPSIjNzZiYzIzIiBkPSJNIDI1Mi41LDE0NC41IEMgMjU0LjgzMywxNDQuNSAyNTcuMTY3LDE0NC41IDI1OS41LDE0NC41QyAyNTkuNSwxNjEuNSAyNTkuNSwxNzguNSAyNTkuNSwxOTUuNUMgMjQyLjA0NSwyMDAuNzYzIDIyNC43MTIsMjA2LjQyOSAyMDcuNSwyMTIuNUMgMjE4LjE2MSwyMzYuNDcxIDIzMy42NjEsMjU2LjgwNSAyNTQsMjczL...[9797 bytes truncated]">
      <div class="brand-text">
        <b>Jawwal Pay Business</b>
        <span>المنصة الالكترونية</span>
      </div>
    </div>

    <div class="search-box">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input type="text" placeholder="ابحث عن خدمة أو حركة...">
    </div>

    <div class="header-actions">
      <div class="dropdown" id="notifDD">
        <button class="icon-btn" onclick="toggleDD('notifDD')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3a5 5 0 0 0-5 5v3.2c0 .6-.2 1.2-.6 1.7L5 15h14l-1.4-2.1c-.4-.5-.6-1.1-.6-1.7V8a5 5 0 0 0-5-5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          <span class="dot"></span>
        </button>
        <div class="dropdown-panel notif-panel">
          <div class="dd-title">الإشعارات</div>
          <div class="notif-empty">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12 3a5 5 0 0 0-5 5v3.2c0 .6-.2 1.2-.6 1.7L5 15h14l-1.4-2.1c-.4-.5-.6-1.1-.6-1.7V8a5 5 0 0 0-5-5Z" stroke="currentColor" stroke-width="1.5"/></svg>
            <div>لا توجد إشعارات جديدة</div>
          </div>
        </div>
      </div>

      <div class="dropdown" id="userDD">
        <div class="user-chip" onclick="toggleDD('userDD')">
          <div class="user-avatar">BA</div>
          <div class="u-meta">
            <b>baraa.arram</b>
            <span>SOUTH-FIELD-USER1</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="dropdown-panel">
          <div class="dd-title">الحساب</div>
          <a href="#"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M4 20c1.5-3.5 4.7-5 8-5s6.5 1.5 8 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> ملف المستخدم</a>
          <a href="#"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.8"/></svg> تغيير كلمة المرور</a>
          <a href="#"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.8"/></svg> تغيير الرمز السري (PIN)</a>
          <a href="#"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.8"/></svg> تعيين الرمز السري (PIN)</a>
          <div class="divider"></div>
          <div class="dd-title">التطبيق</div>
          <a href="#"><img src="data:image/svg+xml;base64,PHN2ZyBpZD0iQ2FwYV8xIiBkYXRhLW5hbWU9IkNhcGEgMSIgeG1sbnM9Imh0cHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNDA1LjMzIDUxMi4wNCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiNmZmY7fS5jbHMtMntmaWxsOiNmY2ZjZmM7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5hbmRyb2lkX3c8L3RpdGxlPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTM2Mi42OCwxOTJIMTQ5LjM1YTEwLjY3LDEwLjY3LDAsMCwwLTEwLjY3LDEwLjY3VjM3My4zN2E1My40Miw1My40MiwwLDAsMCw0Mi42Nyw1Mi4yNlY0ODBhMzIsMzIsMCwwLDAsNjQsMFY0MjYuN2gyMS4zM1Y0ODBhMzIsMzIsMCwwLDAsNjQsMHYtNTQuNGE1My40LDUzLjQsMCwwLDAsNDIuNjctNTIuMjZWMjAyLjdBMTAuNjYsMTAuNjYsMCwwLDAsMzYyLjY4LDE5MloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC01My4zNSAwKSIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTMxMS44NSw1Ni44NWwxOC00MkExMC42NiwxMC42NiwwLDAsMCwzMTAuMjIsNi41bC0xOCw0MmExMTYuMjgsMTE2LjI4LDAsMCwwLTcyLjQxLDBsLTE4LTQyYTEwLjY1LDEwLjY1LDAsMSwwLTE5LjU4LDguMzhsMTgsNDJBMTE3LjQsMTE3LjQsMCwwLDAsMTM4LjY4LDE2MGExMC42NywxMC42NywwLDAsMCwxMC42NywxMC42N0gzNjIuNjhBMTAuNjcsMTAuNjcsMCwwLDAsMzczLjM1LDE2MCwxMTcuNDMsMTE3LjQzLDAsMCwwLDMxMS44NSw1Ni44NVpNMjEzLjM1LDEyOEExMC42NywxMC42NywwLDEsMSwyMjQsMTE3LjM3LDEwLjY3LDEwLjY3LDAsMCwxLDIxMy4zNSwxMjhabTg1LjMzLDBhMTAuNjcsMTAuNjcsMCwxLDEsMTAuNjctMTAuNjZBMTAuNjcsMTAuNjcsMCwwLDEsMjk4LjY4LDEyOFoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC01My4zNSAwKSIvPjxwYXRoIGNsYXNzPSJjbHMtMiIgZD0iTTQyNi42OCwxOTJhMzIsMzIsMCwwLDAtMzIsMzJWMzMwLjdhMzIsMzIsMCwwLDAsNjQsMFYyMjRBMzIsMzIsMCwwLDAsNDI2LjY4LDE5MloiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC01My4zNSAwKSIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTg1LjM1LDE5MmEzMiwzMiwwLDAsMC0zMiwzMlYzMzAuN2EzMiwzMiwwLDAsMCw2NCwwVjIyNEEzMiwzMiwwLDAsMCw4NS4zNSwxOTJaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNTMuMzUgMCkiLz48L3N2Zz4=" style="width:15px;height:15px;filter:invert(56%) sepia(53%) saturate(456%) hue-rotate(51deg);"> تحميل لأندرويد</a>
          <a href="#"><img src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTYgMzE0LjQiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDojZmZmO308L3N0eWxlPjwvZGVmcz48dGl0bGU+YXBwbGVfdzwvdGl0bGU+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjEzLjgsMTY3Yy40NSw0Ny41OCw40MS43NCw2My40MSw0Mi4yLDYzLjYxYTE3MiwxNzIsMCwwLDEtMjEuNzYsNDQuNzJjLTEzLjEsMTkuMTUtMjYuNywzOC4yNC00OC4xMywzOC42My0yMS4wNS4zOS0yNy44Mi0xMi40OC01MS44OS0xMi40OHMtMzEuNTgsMTIuMDktNTEuNSwxMi44N2MtMjAuNjguNzgtMzYuNDMtMjAuNzEtNDkuNjUtMzkuNzktMjctMzktNDcuNjMtMTEwLjMtMTkuOTItMTU4LjQxLDEzLjc2LTIzLjg5LDM4LjM2LTM5LDY1LjA1LTM5LjQsMjAuMzEtLjM5LDM5LjQ4LDEzLjY2LDUxLjg5LDEzLjY2czM1LjctMTYuOSw2MC4xOS0xNC40MmMxMC4yNS40MywzOSw0LjE0LDU3LjUsMzEuMTktMS40OS45Mi0zNC4zMywyMC0zNCw1OS44Mk0xNzQuMjQsNTAuMmMxMS0xMy4yOSwxOC4zNy0zMS43OSwxNi4zNS01MC4yLTE1LjgyLjY0LTM1LDEwLjU1LTQ2LjMxLDIzLjgzQzEzNC4xMSwzNS41OSwxMjUuMiw1NC40MiwxMjcuNiw3Mi40NmMxNy42NCwxLjM3LDM1LjY2LTksNDYuNjQtMjIuMjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDApIi8+PC9zdmc+" style="width:15px;height:15px;filter:invert(20%);"> تحميل لآيفون</a>
          <div class="divider"></div>
          <a href="#" class="danger"><svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> تسجيل خروج</a>
        </div>
      </div>
    </div>
  </div>
</header>`;
}

function renderNav(activeTab = 'merchant') {
  return `
<!-- Nav -->
<nav class="nav-bar">
  <div class="wrap">
    <div class="nav-tabs">
      <div class="nav-tab ${activeTab === 'merchant' ? 'active' : ''}" data-tab="merchant"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.8"/></svg> خدمات المحفظة</div>
      <div class="nav-tab ${activeTab === 'agent' ? 'active' : ''}" data-tab="agent"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20c1.6-4 4.5-5.6 7.5-5.6S17.9 16 19.5 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> الوكيل</div>
      <div class="nav-tab ${activeTab === 'security' ? 'active' : ''}" data-tab="security"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg> الأمن والحماية</div>
      <div class="nav-tab ${activeTab === 'support' ? 'active' : ''}" data-tab="support"><svg viewBox="0 0 24 24" fill="none"><path d="M4 6a2 2 0 0 1 2-2h2l2 5-2 1a10 10 0 0 0 6 6l1-2 5 2v2a2 2 0 0 1-2 2C10.6 20 4 13.4 4 6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg> الدعم الفني</div>
    </div>
  </div>
</nav>

<div class="subnav ${activeTab === 'merchant' ? 'active' : ''}" id="sub-merchant">
  <div class="wrap">
    <a href="#" class="active">الرئيسية</a>
    <a href="#">خدمات الدفع وتحويل الأموال</a>
    <a href="#">خدمات مضافة Jawwal Pay</a>
    <a href="#">تقارير الحركات</a>
    <a href="#">مسار العمل</a>
  </div>
</div>
<div class="subnav ${activeTab === 'agent' ? 'active' : ''}" id="sub-agent">
  <div class="wrap">
    <a href="#">خدمات الافراد والاعمال</a>
    <a href="#">خدمات الوكلاء الفرعيين</a>
    <a href="#">تقييماتي</a>
  </div>
</div>
<div class="subnav ${activeTab === 'security' ? 'active' : ''}" id="sub-security">
  <div class="wrap"><a href="#">المستخدمين</a></div>
</div>
<div class="subnav ${activeTab === 'support' ? 'active' : ''}" id="sub-support">
  <div class="wrap"><a href="#">الشكاوى والاقتراحات</a></div>
</div>`;
}

function renderNewsTicker() {
  return `
<!-- News -->
<div class="news-strip">
  <div class="wrap">
    <div class="news-badge">
      <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
      جديد
    </div>
    <div class="news-text-mask">
      <div class="news-text">تم إضافة خدمة جديدة: تحويل الأموال الفوري - متاحة الآن لجميع العملاء | صيانة مجدولة: سيتم إجراء صيانة للنظام يوم الجمعة من الساعة 2:00 ص إلى 4:00 ص | عرض خاص: رسوم مجانية على جميع التحويلات الداخلية خلال شهر يوليو</div>
    </div>
    <button class="news-more" aria-label="المزيد من الأخبار">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
</div>`;
}

function renderFooter() {
  return `
<!-- Footer -->
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-col">
        <b>تواصل معنا</b>
        <div class="footer-contact">
          <a href="tel:1177"><span class="f-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span> اتصل بنا على 1177</a>
          <a href="mailto:sales@jawwalpay.ps"><span class="f-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z" stroke="currentColor" stroke-width="1.8"/><path d="M22 6l-10 7L2 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span> ارسل ملاحظات</a>
          <a href="#"><span class="f-ic"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span> رقم بيفيدك</a>
        </div>
      </div>
      <div class="footer-col">
        <b>تابعنا</b>
        <div class="footer-social">
          <a href="#" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
          <a href="#" aria-label="Twitter"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
          <a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" stroke="currentColor" stroke-width="2"/><path d="M17.5 6.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>
        </div>
      </div>
      <div class="footer-col">
        <b>روابط</b>
        <div class="footer-links">
          <a href="#">www.JawwalPay.ps</a>
          <a href="#">سياسة الخصوصية</a>
          <a href="#">الشروط والأحكام</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>Jawwal Pay © جميع الحقوق محفوظة</span>
      <span>مرخص من سلطة النقد الفلسطينية</span>
    </div>
  </div>
</footer>`;
}

// Dropdown toggle function
function toggleDD(id) {
  const dd = document.getElementById(id);
  const allDDs = document.querySelectorAll('.dropdown');
  
  allDDs.forEach(d => {
    if (d.id !== id) d.classList.remove('open');
  });
  
  dd.classList.toggle('open');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown').forEach(dd => {
      dd.classList.remove('open');
    });
  }
});

// Navigation tab switching
function initNavTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const subnavs = document.querySelectorAll('.subnav');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      subnavs.forEach(sub => {
        sub.classList.remove('active');
        if (sub.id === 'sub-' + tabName) {
          sub.classList.add('active');
        }
      });
    });
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavTabs);
} else {
  initNavTabs();
}
