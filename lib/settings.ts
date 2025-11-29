interface UserSettings {
  displayName: string;
  defaultTemplate: string;
}

export const defaultSettings: UserSettings = {
  displayName: '',
  defaultTemplate: 'modern',
};

export async function getUserSettings(email: string): Promise<UserSettings> {
  try {
    const response = await fetch(`/api/users/${email}/settings`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return defaultSettings;
  }
}

export async function saveUserSettings(
  email: string,
  settings: UserSettings
): Promise<void> {
  try {
    const response = await fetch(`/api/users/${email}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    // Save to localStorage as backup
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    }
  } catch (error) {
    console.error('Error saving user settings:', error);
    throw error;
  }
}
