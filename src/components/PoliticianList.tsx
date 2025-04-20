import React, { useState, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Politician } from '../types/parliament';
import { View, Image, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, NativeScrollEvent, NativeSyntheticEvent, Linking, Alert, RefreshControl } from 'react-native';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { getPartyColor, getPartyBackgroundColor } from '../utils/partyColors';

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

interface PoliticianListProps {
  politicians: Politician[];
  loading: boolean;
  error: Error | null;
  onLoadMore: () => Promise<void>;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
}

const PoliticianList: React.FC<PoliticianListProps> = ({
  politicians,
  loading,
  error,
  onLoadMore,
  refreshing,
  onRefresh
}) => {
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const navigateToPoliticianDetails = (politician: Politician) => {
    if (!politician?.url) return;
    const id = politician.url.split('/').filter(Boolean).pop() || '';
    navigation.navigate('PoliticianDetails', { id });
  };

  // Handler for scroll events to implement infinite scrolling
  const handleScroll = async (event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
        scrollEventThrottle={400} // Don't trigger too often
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#b22234']}
            tintColor="#b22234"
          />
        }
      >
        {loading && politicians.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#b22234" />
            <Text style={styles.loadingText}>Loading politicians...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {politicians.map((politician) => {
              if (!politician) return null;
              
              const imageSource = getPoliticianImageSource(politician);
              const partyColor = getPartyColor(politician?.current_party?.short_name?.en);
              
              // Generate social media links
              const twitterUrl = politician?.other_info?.twitter_id ? 
                `https://twitter.com/intent/user?user_id=${politician.other_info.twitter_id[0] || politician.other_info.twitter_id}` : null;
              
              const wikipediaUrl = politician?.other_info?.wikipedia_id ?
                `https://en.wikipedia.org/wiki/${politician.other_info.wikipedia_id[0] || politician.other_info.wikipedia_id}` : null;
              
              const facebookUrl = politician?.links?.find(link => link?.url?.includes('facebook'))?.url || null;
              
              const hasSocials = twitterUrl || wikipediaUrl || facebookUrl;
              
              return (
                <TouchableOpacity 
                  key={politician.url} 
                  style={styles.card}
                  onPress={() => navigateToPoliticianDetails(politician)}
                >
                  <View style={[styles.partyColorBand, { backgroundColor: partyColor }]} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={styles.imageContainer}>
                        {imageSource ? (
                          <Image 
                            source={imageSource}
                            style={styles.image}
                            resizeMode="cover"
                            onError={() => setImageError(politician.url)}
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
                      </View>
                    </View>
                    
                    <View style={styles.contactInfoRow}>
                      <View style={styles.contactSection}>
                        {politician?.email && (
                          <TouchableOpacity 
                            style={styles.contactRow}
                            onPress={() => sendEmail(politician.email || '')}
                          >
                            <MaterialIcons name="email" size={16} color={partyColor} style={styles.contactIcon} />
                            <Text style={styles.contactText} numberOfLines={1} ellipsizeMode="tail">
                              {politician.email}
                            </Text>
                          </TouchableOpacity>
                        )}
                        
                        {politician?.voice && (
                          <TouchableOpacity 
                            style={styles.contactRow}
                            onPress={() => makePhoneCall(politician.voice || '')}
                          >
                            <MaterialIcons name="phone" size={16} color={partyColor} style={styles.contactIcon} />
                            <Text style={styles.contactText}>{politician.voice}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {hasSocials && (
                        <View style={styles.socialLinks}>
                          {twitterUrl && (
                            <TouchableOpacity 
                              style={[styles.socialButton, { borderColor: '#1DA1F2', backgroundColor: '#f5f8fa' }]}
                              onPress={() => openLink(twitterUrl)}
                            >
                              <FontAwesome name="twitter" size={18} color="#1DA1F2" />
                            </TouchableOpacity>
                          )}
                          
                          {wikipediaUrl && (
                            <TouchableOpacity 
                              style={[styles.socialButton, { borderColor: '#000000', backgroundColor: '#f8f8f8' }]}
                              onPress={() => openLink(wikipediaUrl)}
                            >
                              <FontAwesome name="wikipedia-w" size={18} color="#000000" />
                            </TouchableOpacity>
                          )}
                          
                          {facebookUrl && (
                            <TouchableOpacity 
                              style={[styles.socialButton, { borderColor: '#3b5998', backgroundColor: '#f7f7fb' }]}
                              onPress={() => openLink(facebookUrl)}
                            >
                              <FontAwesome name="facebook" size={18} color="#3b5998" />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {politicians.length > 0 && (
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
            
            {politicians.length === 0 && !loading && (
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
    overflow: 'hidden',
    position: 'relative',
  },
  partyColorBand: {
    height: 6,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
});

export default PoliticianList; 