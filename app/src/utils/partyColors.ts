/**
 * Utility function to get party colors for consistent theming across the app
 */

/**
 * Gets a color associated with a political party
 * @param partyShortName The short name of the party (e.g. 'Liberal', 'Conservative')
 * @returns A hex color code for the party
 */
export const getPartyColor = (partyShortName?: string): string => {
  if (!partyShortName) return '#666666'; // Default gray for unknown parties
  
  const partyColors: {[key: string]: string} = {
    'Liberal': '#d71920',      // Liberal red
    'Conservative': '#0c2e86', // Conservative blue
    'NDP': '#f58220',          // NDP orange
    'Bloc': '#0388cd',         // Bloc Québécois blue
    'Green': '#3d9b35',        // Green Party green
    'Independent': '#777777',  // Gray for independents
  };
  
  // Find a matching party by checking if the short name includes one of our keys
  const party = Object.keys(partyColors).find(
    key => partyShortName.includes(key)
  );
  return party ? partyColors[party] : '#666666'; // Return party color or default gray
};

/**
 * Gets a light background color for a party, suitable for card backgrounds
 * @param partyShortName The short name of the party
 * @param opacity Optional opacity value (0-100), defaults to 10
 * @returns A hex or rgba color with transparency
 */
export const getPartyBackgroundColor = (partyShortName?: string, opacity: number = 10): string => {
  const baseColor = getPartyColor(partyShortName);
  // Return color with specified opacity (as a percentage)
  return `${baseColor}${opacity.toString(16).padStart(2, '0')}`;
};

export default {
  getPartyColor,
  getPartyBackgroundColor
}; 