import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  Linking, 
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { fetchPoliticianDetails } from '../services/parliamentService';
import { Politician } from '../types/parliament';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PoliticiansStackParamList } from '../types/navigation';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';

type Props = NativeStackScreenProps<PoliticiansStackParamList, 'PoliticianDetails'>;

const PoliticianDetails: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [freshFetch, setFreshFetch] = useState(false);

  // Function to get party color
  const getPartyColor = useCallback((partyShortName?: string) => {
    if (!partyShortName) return '#666666';
    
    const partyColors: {[key: string]: string} = {
      'Liberal': '#d71920',
      'Conservative': '#0c2e86',
      'NDP': '#f58220',
      'Bloc': '#0388cd',
      'Green': '#3d9b35',
      'Independent': '#777777',
    };
    
    const party = Object.keys(partyColors).find(
      key => partyShortName.includes(key)
    );
    
    return party ? partyColors[party] : '#666666';
  }, []);

  const loadPolitician = useCallback(async (forceFresh: boolean = false) => {
    if (!id) return;
    
    try {
      if (!refreshing) setLoading(true);
      setError(null);
      setImageLoadError(false);
      setFreshFetch(forceFresh);
      
      const politicianUrl = `/politicians/${id}/`;
      const data = await fetchPoliticianDetails(politicianUrl, forceFresh);
      setPolitician(data);
      console.log(data)
      // Debug sociacl media links
      if (data) {
        console.log('Twitter ID:', data.other_info?.twitter_id);
        console.log('Wikipedia ID:', data.other_info?.wikipedia_id);
        console.log('Facebook Link:', data.links?.find(link => link.url.includes('facebook')));
        
        const partyColor = getPartyColor(data.memberships?.[0]?.party?.short_name?.en);
        navigation.setOptions({
          title: data.name,
          headerShown: true,
          headerStyle: {
            backgroundColor: partyColor,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        });
      }
    } catch (err) {
      setError('Failed to load politician details');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, navigation, refreshing]);

  useEffect(() => {
    loadPolitician();
  }, [loadPolitician]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPolitician(true);
  }, [loadPolitician]);

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  if (loading && !refreshing) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#b22234" />
      <Text style={styles.loadingText}>Loading politician details...</Text>
    </View>
  );
  
  if (error && !refreshing) return (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={48} color="#b22234" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity 
        style={[styles.retryButton, { backgroundColor: getPartyColor(), marginTop: 16 }]} 
        onPress={() => loadPolitician(true)}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
  
  if (!politician) return (
    <View style={styles.errorContainer}>
      <Text>No politician found</Text>
      <TouchableOpacity 
        style={[styles.retryButton, { backgroundColor: getPartyColor(), marginTop: 16 }]} 
        onPress={() => loadPolitician(true)}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // Determine which image source to use
  let imageSource: any = null;
  
  // First priority: cached local image
  if (politician.cached_image && !imageLoadError) {
    console.log('Using cached image:', politician.cached_image);
    imageSource = { uri: politician.cached_image };
  } 
  // Second priority: remote image
  else if (politician.image && !imageLoadError) {
    // Ensure URL is absolute and clean
    let remoteUrl = politician.image;
    if (!remoteUrl.startsWith('http')) {
      remoteUrl = `https://api.openparliament.ca${remoteUrl}`;
    }
    remoteUrl = remoteUrl.replace(/\s/g, '');
    console.log('Using remote image:', remoteUrl);
    imageSource = { uri: remoteUrl };
  }
  
  // Get party color directly like in PoliticianList.tsx
  const partyColor = getPartyColor(politician.memberships?.[0]?.party?.short_name?.en);
  
  // Create background colors with different opacities using rgba
  const getPartyBgColor = (opacity: number) => {
    // Convert hex color to rgba
    let hex = partyColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  // Background colors with different opacities
  const bgColorLight = getPartyBgColor(10);
  const bgColorMedium = getPartyBgColor(20);
  const bgColorDark = getPartyBgColor(30);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#b22234']}
          tintColor="#b22234"
        />
      }
    >
      <View style={styles.card}>
        <View style={[styles.partyColorBand, { backgroundColor: partyColor }]} />
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.imageContainer}>
              {imageSource ? (
                <Image 
                  source={imageSource}
                  style={styles.image}
                  onError={() => {
                    console.log('Error loading image, falling back to placeholder');
                    setImageLoadError(true);
                  }}
                  resizeMode="contain"
                />
              ) : (
                <View style={[styles.image, styles.placeholderImage]}>
                  <MaterialIcons name="person" size={50} color="#cccccc" />
                </View>
              )}
            </View>
            <View style={styles.headerText}>
              <View style={styles.partyBadge}>
                {politician.current_party && (
                  <Text style={[styles.partyText, { color: partyColor }]}>
                    {politician.current_party.short_name.en}
                  </Text>
                )}
              </View>
              
              {politician.current_riding && (
                <Text style={styles.ridingText}>
                  {politician.current_riding.name.en}, {politician.current_riding.province}
                </Text>
              )}
              
              <View style={styles.contactContainer}>
                {politician.email && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`mailto:${politician.email}`)}
                  >
                    <MaterialIcons name="email" size={18} color={partyColor} style={styles.contactIcon} />
                    <Text style={styles.contactInfo}>{politician.email}</Text>
                  </TouchableOpacity>
                )}
                
                {politician.voice && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`tel:${politician.voice}`)}
                  >
                    <MaterialIcons name="phone" size={18} color={partyColor} style={styles.contactIcon} />
                    <Text style={styles.contactInfo}>{politician.voice}</Text>
                  </TouchableOpacity>
                )}
                
                <View style={styles.socialLinks}>
                  {politician.other_info?.twitter_id?.[0] && (
                    <TouchableOpacity
                      style={[styles.socialButton, { 
                        borderColor: partyColor,
                        backgroundColor: bgColorMedium,
                        shadowColor: partyColor
                      }]}
                      onPress={() => openLink(`https://twitter.com/intent/user?user_id=${politician.other_info?.twitter_id?.[0]}`)}
                    >
                      <FontAwesome name="twitter" size={22} color="#1DA1F2" />
                    </TouchableOpacity>
                  )}
                  
                  {politician.other_info?.wikipedia_id?.[0] && (
                    <TouchableOpacity
                      style={[styles.socialButton, { 
                        borderColor: partyColor,
                        backgroundColor: bgColorMedium,
                        shadowColor: partyColor
                      }]}
                      onPress={() => openLink(`https://en.wikipedia.org/wiki/${politician.other_info?.wikipedia_id?.[0]}`)}
                    >
                      <FontAwesome name="wikipedia-w" size={22} color="#000000" />
                    </TouchableOpacity>
                  )}
                  
                  {politician.links?.find(link => link.url.includes('facebook')) && (
                    <TouchableOpacity
                      style={[styles.socialButton, { 
                        borderColor: partyColor,
                        backgroundColor: bgColorMedium,
                        shadowColor: partyColor
                      }]}
                      onPress={() => openLink(politician.links?.find(link => link.url.includes('facebook'))?.url || '')}
                    >
                      <FontAwesome name="facebook" size={22} color="#3b5998" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

          {politician.memberships && politician.memberships.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: partyColor }]}>Memberships</Text>
              <View style={styles.membershipList}>
                {politician.memberships.map((membership, index) => (
                  <View key={index} style={[styles.membershipCard, { borderLeftColor: getPartyColor(membership.party.short_name.en) }]}>
                    <Text style={styles.membershipTitle}>
                      {membership.label?.en}
                      {membership.party && ` - ${membership.party.name?.en}`}
                    </Text>
                    <Text style={styles.membershipDetails}>
                      {membership.riding && `Riding: ${membership.riding.name?.en}`}
                    </Text>
                    {membership.start_date && (
                      <Text style={styles.membershipDetails}>
                        From: {membership.start_date}
                        {membership.end_date ? ` to ${membership.end_date}` : ' (Current)'}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {politician.related && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: partyColor }]}>Parliamentary Activities</Text>
              <View style={styles.linkGrid}>
                {politician.related.speeches_url && (
                  <TouchableOpacity 
                    onPress={() => openLink(`https://api.openparliament.ca${politician.related?.speeches_url}`)}
                    style={styles.linkButton}
                  >
                    <MaterialIcons name="record-voice-over" size={22} color={partyColor} style={styles.linkIcon} />
                    <Text style={styles.linkText}>Speeches</Text>
                  </TouchableOpacity>
                )}
                {politician.related.ballots_url && (
                  <TouchableOpacity 
                    onPress={() => openLink(`https://api.openparliament.ca${politician.related?.ballots_url}`)}
                    style={styles.linkButton}
                  >
                    <MaterialIcons name="how-to-vote" size={22} color={partyColor} style={styles.linkIcon} />
                    <Text style={styles.linkText}>Voting Record</Text>
                  </TouchableOpacity>
                )}
                {politician.related.sponsored_bills_url && (
                  <TouchableOpacity 
                    onPress={() => openLink(`https://api.openparliament.ca${politician.related?.sponsored_bills_url}`)}
                    style={styles.linkButton}
                  >
                    <MaterialIcons name="description" size={22} color={partyColor} style={styles.linkIcon} />
                    <Text style={styles.linkText}>Sponsored Bills</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  partyColorBand: {
    height: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#e0e0e0',
    padding: 4,
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  partyBadge: {
    marginBottom: 8,
  },
  partyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  ridingText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 12,
  },
  contactContainer: {
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactIcon: {
    marginRight: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  socialLinks: {
    flexDirection: 'row',
    marginTop: 12,
  },
  socialButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  section: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  membershipList: {
    gap: 8,
  },
  membershipCard: {
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  membershipTitle: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 15,
  },
  membershipDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  linkGrid: {
    marginTop: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  linkIcon: {
    marginRight: 12,
  },
  linkText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#b22234',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default PoliticianDetails; 