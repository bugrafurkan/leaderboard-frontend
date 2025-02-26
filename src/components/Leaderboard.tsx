import React, { useState, useEffect } from 'react';
import {
  Box,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  Typography,
  Autocomplete,
  Table
} from '@mui/material';
import { styled } from '@mui/system';
import { motion, Reorder } from 'framer-motion';
import getCountryFlagUtil from './CountryFlag';
import axios from 'axios';
import io from 'socket.io-client';
import ContrastIcon from '@mui/icons-material/Contrast';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';

interface Player {
  playerId: number;
  score: number;
  player: {
    id: number;
    name: string;
    country: string;
    money: number;
  };
}

const defaultColumns = [
  { id: 'rank', label: 'Ranking' },
  { id: 'name', label: 'Player Name' },
  { id: 'country', label: 'Country' },
  { id: 'money', label: 'Money' },
] as const;

// --- Framer Motion ---
const MotionTbody = motion(TableBody);
const MotionTr = motion(TableRow);

// --- Stil Tanımları ---
interface RootContainerProps {
  isDarkMode: boolean;
}

const RootContainer = styled('div')<RootContainerProps>(({ isDarkMode }) => ({
  minHeight: '100vh',
  background: isDarkMode ? 'linear-gradient(180deg, #1A0E2A 0%, #2A1747 100%)' : 'white',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  color: isDarkMode ? '#fff' : '#000',
  fontFamily: 'Poppins, sans-serif',
}));

const Title = styled(Typography)({
  fontSize: '2rem',
  fontWeight: 700,
  marginTop: '40px',
  marginBottom: '20px',
  textTransform: 'uppercase',
});

const ControlBar = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  marginBottom: '20px',
  width: '90%',
  maxWidth: '1000px',
});

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  width: '90%',
  maxWidth: '1000px',
  backgroundColor: 'transparent',
  borderRadius: '8px',
  marginBottom: '40px',
  boxShadow: 'none',
  overflowX: 'hidden'
}));

const StyledTable = styled(Table)({
  borderCollapse: 'separate',
  borderSpacing: '0 8px'
});

const HeaderCell = styled(TableCell)({
  fontWeight: 700,
  fontSize: '1rem',
  textTransform: 'uppercase',
  color: '#8B8B8B',
  backgroundColor: '#3F2A5D',
  borderBottom: 'none',
  padding: '8px 16px',
  borderTopLeftRadius: '12px',
  borderTopRightRadius: '12px',
});

const BodyCell = styled(TableCell)({
  color: '#fff',
  borderBottom: 'none',
  padding: '16px',
  backgroundColor: '#2E1D46',
  '&:first-of-type': {
    borderTopLeftRadius: '50px',
    paddingLeft: '24px',
  },
  '&:last-of-type': {
    borderBottomRightRadius: '50px',
    paddingRight: '24px',
  },
});

const GroupHeaderCell = styled(TableCell)({
  fontWeight: 700,
  fontSize: '1rem',
  color: '#fff',
  backgroundColor: '#3F2A5D',
  borderBottom: 'none',
});

const DraggableTableRow = styled(MotionTr)({
  backgroundColor: '#2E1D46',
  cursor: 'grab',
  '&:hover': {
    backgroundColor: '#3A2560',
  },
});

const SearchContainer = styled(motion.div)({
  flex: 1,
  minWidth: 0,
});

// --- Yardımcı Fonksiyonlar ---
const updateRankings = (players: Player[]): Player[] => {
  return players.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));
};

const groupPlayersByCountry = (list: Player[]): Record<string, Player[]> => {
  const groups: Record<string, Player[]> = {};

  // Oyuncuları ülkelere göre grupla
  list.forEach(player => {
    if (!groups[player.player.country]) {
      groups[player.player.country] = [];
    }
    groups[player.player.country].push({...player});
  });

  // Her ülke grubunu kendi içinde para miktarına göre sırala
  Object.keys(groups).forEach(country => {
    groups[country].sort((a, b) => Number(b.player.money) - Number(a.player.money)); // Para miktarına göre sırala
  });

  return groups;
};

// --- Leaderboard Bileşeni ---
const Leaderboard: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [columns] = useState(defaultColumns);
  const [groupByCountry, setGroupByCountry] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchPlayerId, setSearchPlayerId] = useState<string>('');
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await axios.get('http://leaderboard-backend:3000/api/v1/leaderboard');
        console.log(response.data);
        const formattedPlayers = response.data.top100Entries.map((entry: any, index: number) => ({
          ...entry,
          rank: index + 1
        }));
        setPlayers(formattedPlayers);
        setFilteredPlayers(formattedPlayers);
      } catch (error) {
        console.error('Oyuncular yüklenirken hata oluştu:', error);
      }
    };

    fetchPlayers();

    // WebSocket bağlantısı
    const socket = io('http://leaderboard-backend');

    socket.on('leaderboardUpdate', (data: any) => {
      const formattedPlayers = data.top100Entries.map((entry: any, index: number) => ({
        ...entry,
        rank: index + 1
      }));
      setPlayers(formattedPlayers);
      setFilteredPlayers(formattedPlayers);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Arama
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPlayers(players);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredPlayers(
          players.filter(player =>
              player.player.name.toLowerCase().includes(lowerQuery) ||
              player.player.country.toLowerCase().includes(lowerQuery) ||
              player.playerId.toString().includes(lowerQuery) ||
              player.score.toString().includes(lowerQuery)
          )
      );
    }
  }, [searchQuery, players]);

  // Autocomplete
  const suggestions = React.useMemo(() => {
    if (!searchQuery || searchQuery.length <= 1) {
      return [];
    }
    const allValues = players.flatMap(player => [
      player.player.name,
      player.player.country,
      player.playerId.toString(),
      player.player.money.toString()
    ]);
    return Array.from(new Set(allValues)).filter(value =>
        value.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [players, searchQuery]);

  return (
      <RootContainer isDarkMode={isDarkMode}>
        <Title>LEADERBOARD</Title>

        <ControlBar>
          <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
            <SearchContainer
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
            >
              <Autocomplete
                  freeSolo
                  options={suggestions}
                  value={searchQuery}
                  onChange={(_, newValue) => setSearchQuery(newValue || '')}
                  onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
                  renderInput={(params) => (
                      <TextField
                          {...params}
                          label="Search"
                          placeholder="Search by name, country, rank or score"
                          fullWidth
                          sx={{
                            '.MuiOutlinedInput-root': {
                              color: isDarkMode ? '#fff' : '#000',
                              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(107, 76, 165, 0.1)',
                              borderRadius: '8px',
                              '& fieldset': {
                                borderColor: isDarkMode ? '#6B4CA5' : '#BB86FC',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: isDarkMode ? '#BB86FC' : '#6B4CA5',
                              },
                            },
                            '& .MuiInputLabel-root': {
                              color: isDarkMode ? '#fff' : '#6B4CA5',
                            },
                          }}
                      />
                  )}
              />
            </SearchContainer>

            <TextField
                value={searchPlayerId}
                onChange={(e) => {
                  setSearchPlayerId(e.target.value);
                  const id = parseInt(e.target.value);
                  if (!isNaN(id)) {
                    axios.get(`http://leaderboard-backend/api/v1/leaderboard?searchPlayerId=${id}`)
                        .then(response => {
                          console.log('Search response:', response.data); // Debug log ekleyelim
                          if (response.data.searchedPlayerRange && response.data.searchedPlayerRange.length > 0) {
                            const formattedPlayers = response.data.searchedPlayerRange.map((entry: any) => ({
                              playerId: entry.playerId,
                              score: entry.score,
                              player: entry.player,
                              rank: players.findIndex(p => p.playerId === entry.playerId) + 1
                            }));
                            setFilteredPlayers(formattedPlayers);
                          } else {
                            console.log('No players found for ID:', id);
                          }
                        })
                        .catch(error => {
                          console.error('Arama hatası:', error);
                          setFilteredPlayers(players); // Hata durumunda tüm listeyi göster
                        });
                  } else {
                    setFilteredPlayers(players);
                  }
                }}
                type="number"
                label="Player ID"
                placeholder="Enter Player ID"
                sx={{
                  width: '200px',
                  '.MuiOutlinedInput-root': {
                    color: isDarkMode ? '#fff' : '#000',
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(107, 76, 165, 0.1)',
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: isDarkMode ? '#6B4CA5' : '#BB86FC',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: isDarkMode ? '#BB86FC' : '#6B4CA5',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: isDarkMode ? '#fff' : '#6B4CA5',
                  },
                }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
                variant="contained"
                onClick={() => setGroupByCountry(!groupByCountry)}
                sx={{
                  backgroundColor: '#6B4CA5',
                  '&:hover': {
                    backgroundColor: '#BB86FC',
                  },
                }}
            >
              {groupByCountry ? <TravelExploreIcon /> : <TravelExploreIcon />}
            </Button>

            <Button
                variant="contained"
                onClick={() => setIsDarkMode(!isDarkMode)}
                sx={{
                  backgroundColor: isDarkMode ? '#6B4CA5' : '#BB86FC',
                  '&:hover': {
                    backgroundColor: isDarkMode ? '#BB86FC' : '#6B4CA5',
                  },
                }}
            >
              {isDarkMode ? <ContrastIcon/> : <ContrastIcon/>}
            </Button>
          </Box>
        </ControlBar>

        <StyledTableContainer>
          <StyledTable>
            <TableHead>
              <TableRow>
                {columns.map((col) => (
                    <HeaderCell key={col.id}>{col.label}</HeaderCell>
                ))}
              </TableRow>
            </TableHead>

            {groupByCountry ? (
                Object.entries(groupPlayersByCountry(filteredPlayers))
                    .map(([country, countryPlayers]) => {
                      return (
                          <React.Fragment key={country}>
                            <TableBody>
                              <TableRow>
                                <GroupHeaderCell colSpan={columns.length}>
                                  {/* {getCountryFlagUtil(country)} */} {country}
                                </GroupHeaderCell>
                              </TableRow>
                            </TableBody>

                            <Reorder.Group
                                as="tbody"
                                axis="y"
                                values={countryPlayers}
                                onReorder={(newOrder) => {
                                  const updatedPlayers = [...filteredPlayers];


                                  const countryIndices = updatedPlayers
                                      .map((p, i) => p.player.country === country ? i : -1)
                                      .filter(i => i !== -1);


                                  countryIndices.forEach((oldIndex, i) => {
                                    updatedPlayers[oldIndex] = newOrder[i];
                                  });

                                  setFilteredPlayers(updateRankings(updatedPlayers));
                                }}
                            >
                              {countryPlayers.map((player) => (
                                  <Reorder.Item
                                      key={player.playerId}
                                      value={player}
                                      as="tr"
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -20 }}
                                      whileHover={{
                                        scale: 1.01,
                                        backgroundColor: '#3A2560',
                                        transition: { duration: 0.2 }
                                      }}
                                      whileDrag={{
                                        scale: 1.02,
                                        backgroundColor: '#4A3175',
                                        cursor: 'grabbing',
                                        boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                                      }}
                                      style={{
                                        cursor: 'grab',
                                        backgroundColor: '#2E1D46',
                                        transition: 'background-color 0.2s ease'
                                      }}
                                  >
                                    {columns.map((col) => (
                                        <BodyCell
                                            key={col.id}
                                            style={{
                                              transition: 'all 0.2s ease'
                                            }}
                                        >
                                          {col.id === 'country' ? (
                                              <>
                                                {getCountryFlagUtil(player.player.country)} {player.player.country}
                                              </>
                                          ) : (
                                              col.id === 'rank' ? (filteredPlayers.findIndex(p => p.playerId === player.playerId) + 1) :
                                                  col.id === 'name' ? player.player.name :
                                                      col.id === 'money' ? player.player.money : ''
                                          )}
                                        </BodyCell>
                                    ))}
                                  </Reorder.Item>
                              ))}
                            </Reorder.Group>
                          </React.Fragment>
                      );
                    })
            ) : (
                <Reorder.Group
                    as="tbody"
                    axis="y"
                    values={filteredPlayers}
                    onReorder={(newOrder) => setFilteredPlayers(updateRankings(newOrder))}
                >
                  {filteredPlayers.map((player) => (
                      <Reorder.Item
                          key={player.playerId}
                          value={player}
                          as="tr"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          whileHover={{
                            scale: 1.01,
                            backgroundColor: '#3A2560',
                            transition: { duration: 0.2 }
                          }}
                          whileDrag={{
                            scale: 1.02,
                            backgroundColor: '#4A3175',
                            cursor: 'grabbing',
                            boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
                          }}
                          style={{
                            cursor: 'grab',
                            backgroundColor: '#2E1D46',
                            transition: 'background-color 0.2s ease'
                          }}
                      >
                        {columns.map((col) => (
                            <BodyCell
                                key={col.id}
                                style={{
                                  transition: 'all 0.2s ease'
                                }}
                            >
                              {col.id === 'country' ? (
                                  <>
                                    {getCountryFlagUtil(player.player.country)} {player.player.country}
                                  </>
                              ) : (
                                  col.id === 'rank' ? (filteredPlayers.findIndex(p => p.playerId === player.playerId) + 1) :
                                      col.id === 'name' ? player.player.name :
                                          col.id === 'money' ? player.player.money : ''
                              )}
                            </BodyCell>
                        ))}
                      </Reorder.Item>
                  ))}
                </Reorder.Group>
            )}
          </StyledTable>
        </StyledTableContainer>
      </RootContainer>
  );
};

export default Leaderboard;
