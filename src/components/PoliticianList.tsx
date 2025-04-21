import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Politician } from '../types/parliament';
import { View, Image, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, NativeScrollEvent, NativeSyntheticEvent, Linking, Alert, RefreshControl, GestureResponderEvent } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { getPartyColor } from '../utils/partyColors';
import { WatchedPoliticiansService } from '../services/WatchedPoliticiansService';

/**
 * Get image source for a politician, prioritizing cached images over remote ones.
 */
const getPoliticianImageSource = (politician: Politician) => {
  if (politician?.cached_image) {
    // Use local cached image if available
    return { uri: `file://${politician.cached_image}` };
  } else if (politician?.image) {
    // Use remote image with proper URL
    let remoteUrl = politician.image;
    if (!remoteUrl.startsWith('http')) {
      remoteUrl = `https://api.openparliament.ca${remoteUrl}`;
    }
    return { uri: remoteUrl.replace(/\s/g, '') };
  }
  return null;
};

/**
 * Extract social media links from a politician object
 * Uses the same pattern as PoliticianDetails for consistency, but with additional checks
 */
const extractSocialMediaLinks = (politician: Politician) => {
  // Debug the politician object structure to see what's available
  console.log(`DEBUG ${politician.name} social info:`, 
    politician.other_info ? Object.keys(politician.other_info) : 'no other_info',
    politician.links ? `has ${politician.links.length} links` : 'no links');
  
  // Twitter ID - Try multiple possible locations/formats
  let hasTwitter = false;
  let twitterUrl = null;
  
  // First try other_info.twitter_id
  if (politician?.other_info?.twitter_id) {
    hasTwitter = true;
    const twitterId = Array.isArray(politician.other_info.twitter_id) 
      ? politician.other_info.twitter_id[0] 
      : politician.other_info.twitter_id;
    
    twitterUrl = `https://twitter.com/intent/user?user_id=${twitterId}`;
  } 
  // Try other_info.twitter as fallback
  else if (politician?.other_info?.twitter) {
    hasTwitter = true;
    const twitterHandle = Array.isArray(politician.other_info.twitter) 
      ? politician.other_info.twitter[0] 
      : politician.other_info.twitter;
    
    twitterUrl = `https://twitter.com/${twitterHandle.replace('@', '')}`;
  }
  // Check in links array for twitter.com URLs
  else if (politician?.links?.some(link => link?.url?.includes('twitter.com'))) {
    hasTwitter = true;
    const twitterLink = politician.links.find(link => link?.url?.includes('twitter.com'));
    twitterUrl = twitterLink?.url || null;
  }
  
  // Wikipedia ID - multiple possible formats
  let hasWikipedia = false;
  let wikipediaUrl = null;
  
  if (politician?.other_info?.wikipedia_id) {
    hasWikipedia = true;
    const wikiId = Array.isArray(politician.other_info.wikipedia_id) 
      ? politician.other_info.wikipedia_id[0] 
      : politician.other_info.wikipedia_id;
    
    wikipediaUrl = `https://en.wikipedia.org/wiki/${wikiId}`;
  }
  // Check in links array for wikipedia.org URLs
  else if (politician?.links?.some(link => link?.url?.includes('wikipedia.org'))) {
    hasWikipedia = true;
    const wikiLink = politician.links.find(link => link?.url?.includes('wikipedia.org'));
    wikipediaUrl = wikiLink?.url || null;
  }
  
  // Facebook link - check links array
  let hasFacebook = false;
  let facebookUrl = null;
  
  // Check for Facebook in various formats
  if (politician?.links) {
    const fbLink = politician.links.find(link => 
      link?.url?.includes('facebook.com') || 
      link?.url?.includes('fb.com') ||
      (link?.note && link?.note.toLowerCase().includes('facebook'))
    );
    
    if (fbLink?.url) {
      hasFacebook = true;
      facebookUrl = fbLink.url;
      if (!facebookUrl.startsWith('http')) {
        facebookUrl = `https://${facebookUrl}`;
      }
    }
  }
  
  // Related URLs that might contain social links (PoliticianDetails checks these)
  if (politician.related) {
    console.log(`DEBUG ${politician.name} has related URLs:`, Object.keys(politician.related));
  }
  
  const hasSocials = !!(twitterUrl || wikipediaUrl || facebookUrl);
  
  if (hasSocials) {
    console.log(`Found socials for ${politician.name}: Twitter: ${hasTwitter}, Wiki: ${hasWikipedia}, FB: ${hasFacebook}`);
  } else {
    console.log(`No social media found for ${politician.name}`);
  }
  
  return {
    twitterUrl,
    wikipediaUrl,
    facebookUrl,
    hasSocials
  };
};

interface PoliticianListProps {
  politicians: Politician[];
  loading: boolean;
  error: Error | null;
  onLoadMore?: () => Promise<void>;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onToggleWatch?: (politician: Politician) => Promise<void>;
  onCardPress?: (politician: Politician) => void;
}

// Memoized politician card component to prevent unnecessary re-renders
interface PoliticianCardProps {
  politician: Politician;
  onToggleWatch: (politician: Politician) => void;
  onCardPress: (politician: Politician) => void;
  onOpenLink: (url: string) => void;
  onSendEmail: (email: string) => void;
  onMakePhoneCall: (phoneNumber: string) => void;
}

const PoliticianCard = memo(({ 
  politician, 
  onToggleWatch, 
  onCardPress,
  onOpenLink,
  onSendEmail,
  onMakePhoneCall
}: PoliticianCardProps) => {
  if (!politician) return null;
  
  const imageSource = getPoliticianImageSource(politician);
  const partyColor = getPartyColor(politician?.current_party?.short_name?.en);
  
  // Extract social media info using the helper function - now consistent with PoliticianDetails
  const { twitterUrl, wikipediaUrl, facebookUrl, hasSocials } = extractSocialMediaLinks(politician);

  // Check if contact info is available
  const hasContactInfo = !!(politician?.email || politician?.voice);
  
  // Check if we have full details loaded - Safely handle the hasFullDetails property
  const politicianWithStatus = politician as (Politician & { hasFullDetails?: boolean });
  const hasFullDetails = politicianWithStatus?.hasFullDetails !== undefined 
    ? politicianWithStatus.hasFullDetails 
    : !!(hasContactInfo || hasSocials || (politician?.memberships && politician.memberships.length > 0));

  const handleToggleWatch = (e: GestureResponderEvent) => {
    e.stopPropagation();
    onToggleWatch(politician);
  };
  
  return (
    <TouchableOpacity 
      key={politician.url} 
      style={styles.card}
      onPress={() => onCardPress(politician)}
    >
      <View style={[styles.partyColorBand, { backgroundColor: partyColor }]} />
      
      {/* Star toggle button */}
      <TouchableOpacity 
        style={styles.watchButton}
        onPress={handleToggleWatch}
      >
        <FontAwesome 
          name={politician.isWatching ? "star" : "star-o"} 
          size={26} 
          color="#FFD700"
        />
      </TouchableOpacity>
      
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.imageContainer}>
            {imageSource ? (
              <Image 
                source={imageSource}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholderImage]}>
                <MaterialIcons name="person" size={40} color="#cccccc" />
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{politician.name || 'Unknown'}</Text>
            <View style={styles.partyBadge}>
              <Text style={[styles.partyText, { color: partyColor }]}>
                {politician?.current_party?.short_name?.en || 'Unknown Party'}
              </Text>
            </View>
            <Text style={styles.ridingText}>
              {politician?.current_riding?.name?.en || 'Unknown Riding'}
              {politician?.current_riding?.province ? `, ${politician.current_riding.province}` : ''}
            </Text>
            
            {/* Show indicator if details are not fully loaded */}
            {!hasFullDetails && (
              <View style={styles.incompleteInfoBadge}>
                <MaterialIcons name="info-outline" size={14} color="#666" style={styles.infoIcon} />
                <Text style={styles.incompleteInfoText}>Tap for more details</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.contactInfoRow}>
          <View style={styles.contactSection}>
            {politician?.email ? (
              <TouchableOpacity 
                style={styles.contactRow}
                onPress={() => onSendEmail(politician.email || '')}
              >
                <MaterialIcons name="email" size={16} color={partyColor} style={styles.contactIcon} />
                <Text style={styles.contactText} numberOfLines={1} ellipsizeMode="tail">
                  {politician.email}
                </Text>
              </TouchableOpacity>
            ) : !hasFullDetails && (
              <View style={styles.missingContactRow}>
                <MaterialIcons name="email" size={16} color="#999" style={styles.contactIcon} />
                <Text style={styles.missingContactText}>Contact info may be available</Text>
              </View>
            )}
            
            {politician?.voice ? (
              <TouchableOpacity 
                style={styles.contactRow}
                onPress={() => onMakePhoneCall(politician.voice || '')}
              >
                <MaterialIcons name="phone" size={16} color={partyColor} style={styles.contactIcon} />
                <Text style={styles.contactText}>{politician.voice}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          
          {hasSocials ? (
            <View style={styles.socialLinks}>
              {twitterUrl && (
                <TouchableOpacity 
                  style={[styles.socialButton, { borderColor: '#1DA1F2', backgroundColor: '#f5f8fa' }]}
                  onPress={() => onOpenLink(twitterUrl)}
                >
                  <FontAwesome name="twitter" size={18} color="#1DA1F2" />
                </TouchableOpacity>
              )}
              
              {wikipediaUrl && (
                <TouchableOpacity 
                  style={[styles.socialButton, { borderColor: '#000000', backgroundColor: '#f8f8f8' }]}
                  onPress={() => onOpenLink(wikipediaUrl)}
                >
                  <FontAwesome name="wikipedia-w" size={18} color="#000000" />
                </TouchableOpacity>
              )}
              
              {facebookUrl && (
                <TouchableOpacity 
                  style={[styles.socialButton, { borderColor: '#3b5998', backgroundColor: '#f7f7fb' }]}
                  onPress={() => onOpenLink(facebookUrl)}
                >
                  <FontAwesome name="facebook" size={18} color="#3b5998" />
                </TouchableOpacity>
              )}
            </View>
          ) : !hasFullDetails && (
            <TouchableOpacity 
              style={styles.moreInfoButton}
              onPress={() => onCardPress(politician)}
            >
              <Text style={styles.moreInfoButtonText}>More Info</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const PoliticianList: React.FC<PoliticianListProps> = ({
  politicians,
  loading,
  error,
  onLoadMore,
  refreshing,
  onRefresh,
  onToggleWatch,
  onCardPress
}) => {
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [localPoliticians, setLocalPoliticians] = useState<Politician[]>(politicians);
  
  // Create a local reference to the service
  const watchedService = WatchedPoliticiansService.getInstance();

  // Log state for debugging
  console.log(`PoliticianList: onToggleWatch prop is ${onToggleWatch ? 'provided' : 'NOT provided'}`);
  console.log(`PoliticianList: has ${politicians.length} politicians and ${localPoliticians.length} local politicians`);
  
  // Update local state when politicians prop changes
  useEffect(() => {
    console.log(`PoliticianList: Received ${politicians.length} politicians from parent`);
    // Politicians from parent should already be sorted by the usePoliticians hook
    setLocalPoliticians(politicians);
  }, [politicians]);

  // Local toggle function - optimized
  const handleLocalToggleWatch = useCallback(async (politician: Politician) => {
    try {
      if (!politician?.url) {
        console.error('Cannot toggle watch status: politician missing URL');
        return;
      }

      const isCurrentlyWatched = politician.isWatching === true;
      const newStatus = !isCurrentlyWatched;
      
      console.log(`[PoliticianList] Toggling watch for ${politician.name} from ${isCurrentlyWatched} to ${newStatus}`);
      
      // First update the database to ensure persistence
      try {
        if (newStatus) {
          await watchedService.watchPolitician(politician);
        } else {
          await watchedService.unwatchPolitician(politician.url);
        }
        
        // Create an updated politician object with the new watch status
        const updatedPolitician = { ...politician, isWatching: newStatus };
        
        // Apply optimistic UI update
        setLocalPoliticians(prev => {
          // Remove the politician from the list
          const filtered = prev.filter(p => p.url !== politician.url);
          
          // Add the updated version
          const updated = [...filtered, updatedPolitician];
          
          // Sort the list (watched first, then alphabetically)
          return updated.sort((a, b) => {
            if (a.isWatching && !b.isWatching) return -1;
            if (!a.isWatching && b.isWatching) return 1;
            return (a.name || '').localeCompare(b.name || '');
          });
        });
        
        // If the parent provides a toggle function, call it after our local update
        if (onToggleWatch) {
          await onToggleWatch(politician).catch(err => {
            console.error('[PoliticianList] Error in parent onToggleWatch:', err);
          });
        }
      } catch (error) {
        console.error(`[PoliticianList] Failed to ${newStatus ? 'watch' : 'unwatch'} ${politician.name}:`, error);
        // Show error to user
        Alert.alert(
          'Update Failed',
          `Could not ${newStatus ? 'star' : 'unstar'} ${politician.name}. Please try again.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[PoliticianList] Error in local toggle watch:', error);
    }
  }, [watchedService, onToggleWatch]);

  const navigateToPoliticianDetails = (politician: Politician) => {
    if (!politician?.url) return;
    const id = politician.url.split('/').filter(Boolean).pop() || '';
    navigation.navigate('PoliticianDetails', { id });
  };

  // Handler for scroll events to implement infinite scrolling
  const handleScroll = async (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!onLoadMore) return;
    
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    
    // Check if user has scrolled to bottom (with a threshold of 50px)
    const isCloseToBottom = (layoutMeasurement.height + contentOffset.y) >= (contentSize.height - 150);
    
    if (isCloseToBottom && !loading && !isLoadingMore && !refreshing) {
      setIsLoadingMore(true);
      await onLoadMore();
      setIsLoadingMore(false);
    }
  };

  // Function to handle opening external links
  const openLink = (url: string) => {
    if (!url) return;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Cannot open link', 'The link could not be opened.');
      }
    });
  };

  // Function to make a phone call
  const makePhoneCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    
    const telUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(telUrl).then(supported => {
      if (supported) {
        Linking.openURL(telUrl);
      } else {
        Alert.alert('Cannot make call', 'Phone calls are not supported on this device.');
      }
    });
  };
  
  // Function to send an email
  const sendEmail = (email: string) => {
    if (!email) return;
    
    const mailUrl = `mailto:${email}`;
    Linking.canOpenURL(mailUrl).then(supported => {
      if (supported) {
        Linking.openURL(mailUrl);
      } else {
        Alert.alert('Cannot send email', 'Email is not supported on this device.');
      }
    });
  };

  // Memoize rendering politicians to prevent unnecessary re-renders
  const renderedPoliticians = useMemo(() => {
    return localPoliticians.map(politician => (
      <PoliticianCard
        key={politician.url}
        politician={politician}
        onToggleWatch={handleLocalToggleWatch}
        onCardPress={onCardPress || navigateToPoliticianDetails}
        onOpenLink={openLink}
        onSendEmail={sendEmail}
        onMakePhoneCall={makePhoneCall}
      />
    ));
  }, [localPoliticians, handleLocalToggleWatch, onCardPress, navigateToPoliticianDetails, openLink, sendEmail, makePhoneCall]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#b22234" />
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={onRefresh}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <ScrollView 
        style={styles.scrollContent}
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#b22234']}
            tintColor="#b22234"
          />
        }
      >
        {loading && localPoliticians.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#b22234" />
            <Text style={styles.loadingText}>Loading politicians...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {renderedPoliticians}
            
            {localPoliticians.length > 0 && onLoadMore && (
              <View style={styles.loadMoreContainer}>
                {isLoadingMore && (
                  <ActivityIndicator 
                    size="small" 
                    color="#b22234" 
                    style={styles.loadingMoreIndicator} 
                  />
                )}
              </View>
            )}
            
            {localPoliticians.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="person-search" size={48} color="#999" />
                <Text style={styles.emptyText}>
                  No politicians found matching your criteria.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  watchText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 12,
  },
  watchButton: {
    position: 'absolute',
    top: 8,
    right: 4,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partyColorBand: {
    height: 8,
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  imageContainer: {
    width: 65,
    height: 100,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partyBadge: {
    marginBottom: 4,
  },
  partyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ridingText: {
    fontSize: 14,
    color: '#444',
  },
  contactInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 0,
  },
  contactSection: {
    flex: 1,
    marginRight: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  socialLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    maxWidth: 120,
    gap: 8,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#666',
    marginVertical: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginVertical: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#b22234',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingMoreIndicator: {
    marginTop: 10,
    marginBottom: 20
  },
  incompleteInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  infoIcon: {
    marginRight: 4,
  },
  incompleteInfoText: {
    fontSize: 12,
    color: '#666',
  },
  missingContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  missingContactText: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  moreInfoButton: {
    backgroundColor: '#f2f2f2',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  moreInfoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
});

export default memo(PoliticianList); 