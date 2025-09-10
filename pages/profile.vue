<template>
  <div class="profile-page">
    <!-- Background Effects -->
    <div class="profile-background">
      <div class="profile-gradient"></div>
      <div class="profile-pattern"></div>
    </div>

    <!-- Content Container -->
    <div class="profile-container">
      <!-- Header Section -->
      <n-space vertical align="center" :size="24" class="profile-header">
        <n-avatar 
          :size="80" 
          class="user-avatar"
        >
          <n-icon size="40">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
            </svg>
          </n-icon>
        </n-avatar>
        <n-h2 class="profile-title">
          <n-gradient-text type="primary">
            Profile Settings
          </n-gradient-text>
        </n-h2>
        <n-text class="profile-subtitle">
          Manage your exchange connections and API keys
        </n-text>
      </n-space>

      <!-- Exchange Connections Card -->
      <n-card class="profile-card" :bordered="false">
        <template #header>
          <n-space justify="space-between" align="center">
            <n-space align="center" :size="12">
              <n-icon size="24" color="#18a058">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
              </n-icon>
              <n-text strong style="font-size: 1.1rem;">Connected Exchanges</n-text>
            </n-space>
            <n-tag type="success" v-if="tableData.length > 0">
              {{ tableData.length }} Active
            </n-tag>
            <n-tag type="default" v-else>
              No Connections
            </n-tag>
          </n-space>
        </template>

        <n-empty 
          v-if="tableData.length === 0" 
          description="No exchanges connected yet"
          class="empty-state"
        >
          <template #extra>
            <n-text depth="3">
              Add your first exchange connection below to start trading
            </n-text>
          </template>
        </n-empty>

        <n-data-table
          v-else
          :columns="tableColumns"
          :data="tableData"
          :pagination="tablePagination"
          :bordered="false"
          class="exchanges-table"
        />
      </n-card>

      <!-- Add Exchange Card -->
      <n-card class="profile-card add-exchange-card" :bordered="false">
        <template #header>
          <n-space align="center" :size="12">
            <n-icon size="24" color="#18a058">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
              </svg>
            </n-icon>
            <n-text strong style="font-size: 1.1rem;">Add New Exchange</n-text>
          </n-space>
        </template>

        <n-form 
          ref="formRef" 
          size="large"
        >
          <n-grid :cols="1" :y-gap="20">
            <n-grid-item>
              <n-form-item label="Exchange">
                <n-select 
                  v-model:value="selectedExchange"
                  :options="availableExchanges"
                  placeholder="Select an exchange to connect"
                  filterable
                  size="large"
                  class="exchange-select"
                />
              </n-form-item>
            </n-grid-item>

            <n-grid-item>
              <n-form-item label="API Credentials">
                <n-space vertical :size="12" style="width: 100%;">
                  <n-input-group size="large">
                    <n-input-group-label size="large">API Key</n-input-group-label>
                    <n-input 
                      v-model:value="apiKeys[0].value"
                      placeholder="Enter your API key"
                      type="password"
                      show-password-on="click"
                      size="large"
                    />
                  </n-input-group>
                  <n-input-group size="large">
                    <n-input-group-label size="large">Secret</n-input-group-label>
                    <n-input 
                      v-model:value="apiKeys[1].value"
                      placeholder="Enter your API secret"
                      type="password"
                      show-password-on="click"
                      size="large"
                    />
                  </n-input-group>
                </n-space>
              </n-form-item>
            </n-grid-item>

            <n-grid-item>
              <n-button 
                @click="addExchange" 
                :disabled="addBtn.disabled || !selectedExchange || !apiKeys[0].value || !apiKeys[1].value"
                :loading="addBtn.disabled"
                type="primary"
                size="large"
                block
                class="add-button"
              >
                <template #icon>
                  <n-icon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                    </svg>
                  </n-icon>
                </template>
                {{ addBtn.text }}
              </n-button>
            </n-grid-item>
          </n-grid>
        </n-form>

        <!-- Security Notice -->
        <n-alert 
          type="info" 
          :bordered="false"
          style="margin-top: 20px;"
        >
          <template #icon>
            <n-icon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
            </n-icon>
          </template>
          <strong>Security Note:</strong> Your API keys are encrypted and stored securely. Never share your secret keys with anyone.
        </n-alert>
      </n-card>

      <!-- Account Settings Card -->
      <n-card class="profile-card" :bordered="false">
        <template #header>
          <n-space align="center" :size="12">
            <n-icon size="24" color="#18a058">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </n-icon>
            <n-text strong style="font-size: 1.1rem;">Account Settings</n-text>
          </n-space>
        </template>

        <n-grid :cols="2" :x-gap="20" :y-gap="20">
          <n-grid-item>
            <n-statistic label="Account Status">
              <template #prefix>
                <n-icon color="#18a058">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </n-icon>
              </template>
              Active
            </n-statistic>
          </n-grid-item>
          <n-grid-item>
            <n-statistic label="Connected Exchanges" :value="tableData.length">
              <template #prefix>
                <n-icon>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </n-icon>
              </template>
            </n-statistic>
          </n-grid-item>
        </n-grid>
      </n-card>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue';
import { NButton, NIcon } from "naive-ui";

definePageMeta({
    middleware: 'auth'
})

const notification = useNotification();
const message = useMessage();

// Add entrance animation to components
onMounted(() => {
  // Trigger reflow to ensure animations play
  document.querySelector('.profile-page')?.offsetHeight;
});

const addBtn = ref({
  'text':'Add Exchange',
  'disabled':false,
});

const formData = ref({
  exchange: null,
  apiKeys: []
});

// Table configuration with modern styling
const tablePagination = false;
const tableColumns = [
    {
        title: "Exchange",
        key: "exchange",
        render(row) {
            return h('div', { class: 'exchange-name' }, [
                h(NIcon, { 
                    size: 20, 
                    style: { marginRight: '8px', verticalAlign: 'middle' },
                    color: '#18a058'
                }, {
                    default: () => h('svg', {
                        xmlns: "http://www.w3.org/2000/svg",
                        viewBox: "0 0 20 20",
                        fill: "currentColor"
                    }, [
                        h('path', {
                            d: "M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"
                        }),
                        h('path', {
                            'fill-rule': "evenodd",
                            d: "M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z",
                            'clip-rule': "evenodd"
                        })
                    ])
                }),
                h('span', { style: { fontWeight: '500' } }, row.exchange)
            ]);
        }
    },
    {
        title: "API Key",
        key: "apiKeys",
        render(row) {
            const maskedKey = row.apiKeys ? '••••••••' + row.apiKeys.slice(-4) : '••••••••';
            return h('code', { 
                style: { 
                    background: 'rgba(24, 160, 88, 0.1)', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    fontSize: '0.9em'
                } 
            }, maskedKey);
        }
    },
    {
        title: "Status",
        key: "status",
        render() {
            return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
                h('div', { 
                    style: { 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: '#18a058',
                        marginRight: '8px',
                        animation: 'pulse 2s infinite',
                        boxShadow: '0 0 0 2px rgba(24, 160, 88, 0.2)'
                    } 
                }),
                h('span', { style: { color: '#18a058', fontWeight: '500' } }, 'Connected')
            ]);
        }
    },
    {
        title: "Actions",
        key: "actions",
        render(row) {
            return h(
                NButton,
                {
                    strong: true,
                    tertiary: true,
                    type: "error",
                    size: "small",
                    onClick: () => deleteKeys(row)
                },
                { 
                    default: () => [
                        h(NIcon, { 
                            style: { 
                                marginRight: '4px',
                                transition: 'transform 0.3s ease'
                            },
                            class: 'delete-icon'
                        }, {
                            default: () => h('svg', {
                                xmlns: "http://www.w3.org/2000/svg",
                                viewBox: "0 0 20 20",
                                fill: "currentColor"
                            }, [
                                h('path', {
                                    'fill-rule': "evenodd",
                                    d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z",
                                    'clip-rule': "evenodd"
                                })
                            ])
                        }),
                        "Remove"
                    ]
                }
            );
        }
    },
];

// Fetch user exchanges
const { data: userExchanges } = await useFetch('/api/v1/fetchUserExchanges');

const tableData = ref([]);
if (userExchanges.value && userExchanges.value.data) {
    for (let i = 0; i < userExchanges.value.data.length; i++) {
        tableData.value.push({
            id: userExchanges.value.data[i]._id,
            exchange: userExchanges.value.data[i].exchange,
            apiKeys: userExchanges.value.data[i].apiKeys[0].value,
            actions: ''
        })
    }
}

// Fetch available exchanges
const selectedExchange = ref(null);
let exchanges = await $fetch('/api/v1/fetchCCXTExchanges');
let availableExchanges = [];

for (let i = 0; i < exchanges.data.length; i++) {
    availableExchanges.push({
        label: exchanges.data[i],
        value: exchanges.data[i],
    })
}

const apiKeys = ref([
    {
        key: "apiKey",
        value: ""
    },
    {
        key: "secret",
        value: ""
    }
]);

async function addExchange() {
    if (!selectedExchange.value || !apiKeys.value[0].value || !apiKeys.value[1].value) {
        message.error('Please fill in all required fields');
        return;
    }

    let data = {
        exchange: selectedExchange.value,
        apiKeys: apiKeys.value,
    }

    addBtn.value.text = 'Adding...';
    addBtn.value.disabled = true;

    try {
        let resp = await $fetch('/api/v1/addUserExchange', {
            method: 'POST',
            body: data
        });

        tableData.value.push({
            id: resp.data._id,
            exchange: resp.data.exchange,
            apiKeys: resp.data.apiKeys[0].value,
            actions: ''
        })

        notification.success({
            title: "Exchange Added Successfully",
            content: `${data.exchange} has been connected to your account`,
            duration: 3000,
            meta: new Date().toLocaleTimeString()
        });

        // Reset form
        selectedExchange.value = null;
        apiKeys.value = [
            {
                key: "apiKey",
                value: ""
            },
            {
                key: "secret",
                value: ""
            }
        ];
    } catch (error) {
        notification.error({
            title: "Failed to Add Exchange",
            content: error.data?.message || "Please check your API credentials and try again",
            duration: 4000,
        });
    } finally {
        addBtn.value.text = 'Add Exchange';
        addBtn.value.disabled = false;
    }
}

async function deleteKeys(row) {
    let data = {
        exchange: row.exchange,
        id: row.id,
    }

    try {
        let resp = await $fetch('/api/v1/deleteUserExchange', {
            method: 'POST',
            body: data
        });

        const index = tableData.value.findIndex((obj) => obj.id === resp.data._id);
        if (index !== -1) {
            tableData.value.splice(index, 1);
        }

        notification.success({
            title: "Exchange Removed",
            content: `${data.exchange} has been disconnected from your account`,
            duration: 3000,
            meta: new Date().toLocaleTimeString()
        });
    } catch (error) {
        notification.error({
            title: "Failed to Remove Exchange",
            content: "Please try again later",
            duration: 3000,
        });
    }
}
</script>

<style scoped>
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(24, 160, 88, 0.4);
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(24, 160, 88, 0);
    transform: scale(1);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(24, 160, 88, 0);
    transform: scale(1);
  }
}

.profile-page {
  min-height: calc(100vh - 64px);
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

/* Background Effects */
.profile-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  pointer-events: none;
}

.profile-gradient {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at top left, 
    rgba(36, 171, 255, 0.08) 0%, 
    transparent 50%),
    radial-gradient(ellipse at bottom right, 
    rgba(24, 160, 88, 0.06) 0%, 
    transparent 50%);
  animation: gradientShift 20s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

.profile-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.01) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.3;
}

/* Content Container */
.profile-container {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-container > * {
  animation: staggeredFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) backwards;
}

.profile-container > *:nth-child(1) { animation-delay: 0.1s; }
.profile-container > *:nth-child(2) { animation-delay: 0.2s; }
.profile-container > *:nth-child(3) { animation-delay: 0.3s; }
.profile-container > *:nth-child(4) { animation-delay: 0.4s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes staggeredFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Header Section */
.profile-header {
  margin-bottom: 2rem;
  text-align: center;
  animation: fadeIn 0.8s ease-out;
}

.user-avatar {
  background: linear-gradient(135deg, #18a058 0%, #10b981 100%);
  box-shadow: 0 8px 24px rgba(24, 160, 88, 0.3);
  animation: avatarPulse 3s ease-in-out infinite;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.user-avatar:hover {
  transform: rotate(5deg);
  box-shadow: 0 12px 32px rgba(24, 160, 88, 0.4);
}

@keyframes avatarPulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 8px 24px rgba(24, 160, 88, 0.3);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 12px 32px rgba(24, 160, 88, 0.4);
  }
}

.profile-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
}

.profile-subtitle {
  font-size: 1.1rem;
  opacity: 0.8;
}

/* Cards */
.profile-card {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
  animation: slideIn 0.6s ease-out;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.profile-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, 
    transparent,
    rgba(255, 255, 255, 0.03),
    transparent
  );
  transition: left 0.6s ease;
}

.profile-card:hover::before {
  left: 100%;
}

.profile-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18);
  border-color: rgba(24, 160, 88, 0.2);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.profile-card:deep(.n-card__header) {
  padding: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
}

.profile-card:hover:deep(.n-card__header) {
  background: rgba(24, 160, 88, 0.02);
}

.profile-card:deep(.n-card__content) {
  padding: 1.5rem;
  transition: all 0.3s ease;
}

/* Delete Icon Animation */
:deep(.n-button:hover .delete-icon) {
  transform: rotate(-10deg);
}

/* Add Exchange Card */
.add-exchange-card {
  background: linear-gradient(135deg, 
    rgba(24, 160, 88, 0.03) 0%, 
    rgba(36, 171, 255, 0.03) 100%);
  position: relative;
}

.add-exchange-card::after {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, #18a058, #24abff, #18a058);
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  transition: opacity 0.4s ease;
  background-size: 400% 400%;
  animation: gradientRotate 8s ease infinite;
}

.add-exchange-card:hover::after {
  opacity: 0.1;
}

@keyframes gradientRotate {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Form Elements */
.exchange-select:deep(.n-base-selection) {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.exchange-select:deep(.n-base-selection:hover) {
  border-color: rgba(24, 160, 88, 0.5);
  background: rgba(24, 160, 88, 0.03);
  transform: translateY(-2px);
}

.exchange-select:deep(.n-base-selection:focus) {
  border-color: #18a058;
  box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.2);
  transform: translateY(-2px);
}

.exchange-select:deep(.n-base-select-option) {
  transition: all 0.2s ease;
}

.exchange-select:deep(.n-base-select-option:hover) {
  background: rgba(24, 160, 88, 0.1);
  transform: translateX(4px);
}

/* Table Styling */
.exchanges-table {
  animation: fadeIn 0.6s ease-out;
}

.exchanges-table:deep(.n-data-table-th) {
  background: rgba(24, 160, 88, 0.05);
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.5px;
  transition: background 0.3s ease;
}

.exchanges-table:deep(.n-data-table-td) {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.exchanges-table:deep(.n-data-table-tr) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.exchanges-table:deep(.n-data-table-tr:hover) {
  background: rgba(24, 160, 88, 0.03);
  transform: translateX(4px);
}

.exchanges-table:deep(.n-data-table-tr:hover .n-data-table-td) {
  border-bottom-color: rgba(24, 160, 88, 0.1);
}

/* Button Styling */
.add-button {
  background: linear-gradient(135deg, #18a058 0%, #10b981 100%);
  font-weight: 600;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.add-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.add-button:hover::after {
  width: 300px;
  height: 300px;
}

.add-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(24, 160, 88, 0.5);
}

.add-button:active:not(:disabled) {
  transform: translateY(-1px);
}

.add-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
}

/* Empty State */
.empty-state {
  padding: 3rem 0;
  animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Responsive Design */
@media (max-width: 768px) {
  .profile-container {
    padding: 0 1rem;
  }
  
  .profile-card:deep(.n-card__header) {
    padding: 1rem;
  }
  
  .profile-card:deep(.n-card__content) {
    padding: 1rem;
  }
  
  .profile-title {
    font-size: 1.5rem;
  }
}

/* Additional Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.exchange-name {
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.exchanges-table:deep(.n-data-table-tr:hover .exchange-name) {
  transform: translateX(4px);
  color: #18a058;
}

/* Input Group Styling */
:deep(.n-input-group-label) {
  background: rgba(24, 160, 88, 0.05);
  border-color: rgba(24, 160, 88, 0.2);
  min-width: 100px;
  transition: all 0.3s ease;
}

:deep(.n-input-group:hover .n-input-group-label) {
  background: rgba(24, 160, 88, 0.08);
  border-color: rgba(24, 160, 88, 0.3);
}

:deep(.n-input__input-el) {
  background: transparent;
  transition: all 0.3s ease;
}

:deep(.n-input) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.n-input:hover) {
  border-color: rgba(24, 160, 88, 0.5);
  transform: translateY(-1px);
}

:deep(.n-input:focus) {
  border-color: #18a058;
  box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.15);
  transform: translateY(-2px);
}

/* Alert Styling */
:deep(.n-alert) {
  background: rgba(36, 171, 255, 0.05);
  border: 1px solid rgba(36, 171, 255, 0.2);
  animation: slideInRight 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transition: all 0.3s ease;
}

:deep(.n-alert:hover) {
  background: rgba(36, 171, 255, 0.08);
  border-color: rgba(36, 171, 255, 0.3);
  transform: translateX(4px);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>