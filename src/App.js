import './App.css';
import {
  alpha,
  AppBar,
  Autocomplete,
  Box, Button,
  CircularProgress,
  FormControl, FormControlLabel, FormLabel, Input, Radio, RadioGroup, styled,
  TextField,
  Toolbar,
  Typography
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import {useEffect, useRef, useState} from "react";
import Message from "./message";

const API_ROOT = process.env.REACT_APP_API_ROOT;
const PAGE = 10

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.25),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.black, 0.35),
  },
  marginRight: theme.spacing(2),
  marginBottom: theme.spacing(1),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  color: 'black',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const CloseIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 1),
  height: '100%',
  position: 'absolute',
  right: 0,
  top: 0,
  color: 'black',
  pointerEvents: 'fill',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));


const StyledInputBase = styled(Input)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 5, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    '&::placeholder': {
      color: 'white'
    },
    [theme.breakpoints.up('md')]: {
      width: '40ch',
    },
  },
}));

function App() {
  const [currentSite, setCurrentSite] = useState(undefined);
  const [sites, setSites] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [skip, setSkip] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState(undefined);
  const inputRef = useRef();
  const [sortType, setSortType] = useState("date")

  useEffect(() => {
    if (sites === undefined) {
      fetch(API_ROOT + "/sites")
        .then(response => response.json())
        .then(res => setSites(res))
    }
  }, [sites])

  useEffect(() => {
    const request = {
      site_id: currentSite?.id,
      sort: sortType,
      query: searchQuery === undefined ? '*': searchQuery,
      skip: skip
    }
    console.log(request)
    fetch(API_ROOT + '/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    }).then(response => response.json())
      .then(res => {
        setTotal(res.total)
        setMessages(res.messages);
      })
  }, [currentSite, skip, searchQuery, sortType])

  return (
    <div className="App">
      <AppBar position="static" style={{ background: 'transparent'}}>
          <Toolbar>
            <Box p={1}>
              {sites === undefined ? (<CircularProgress color="secondary"/>) : (
                <Autocomplete options={sites}
                              defaultValue={currentSite}
                              sx={{ width: 300 }}
                              getOptionLabel={site => site?.name}
                              onChange={(event, newValue) => {
                                if (sites.includes(newValue)) {
                                  setMessages([]);
                                  setCurrentSite(newValue);
                                } else {
                                  setCurrentSite(undefined);
                                  setMessages([]);
                                }
                              }}
                              renderInput={(params) =>
                                <TextField {...params} label="Выбор канала"/>}/>
              )}
            </Box>

            <Box p={1}>
              <Search>
                <SearchIconWrapper>
                  <SearchIcon/>
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Введите запрос и нажмите Enter"
                  inputProps={{ 'aria-label': 'search' }}
                  inputRef={inputRef}
                  onKeyUp={(e) => {
                  if (e.keyCode === 13) {
                    setSkip(0);
                    setSearchQuery(e.target.value);
                    setSortType("relevance");
                  }
                }}
                />
                <CloseIconWrapper onClick={() => {
                  setSkip(0);
                  setSearchQuery(undefined);
                  setSortType("date")
                  inputRef.current.value = '';
                }}>
                  <ClearIcon/>
                </CloseIconWrapper>
              </Search>
            </Box>
            <Box p={1} sx={{color:'black'}}>
              <FormControl>
                <FormLabel>Сортировка</FormLabel>
                <RadioGroup row name="sort_order"
                            value={sortType}
                            onChange={(e) => setSortType(e.target.value)}
                >
                  <FormControlLabel value="date" disabled={total === 0} control={<Radio />} label="В хронологическом порядке" />
                  <FormControlLabel value="relevance" control={<Radio />} label="Наиболее релевантные" disabled={searchQuery === undefined || total === 0}/>
                </RadioGroup>
              </FormControl>
            </Box>

            <Box p={1} sx={{color:'black'}}>
              <Typography>
                {total === 0 ? ("ничего не найдено") : total === 10000 ? "Более 10 тыс." : `Найдено: ${total}` }
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }}/>

            <Box p={1}>
              {skip > 0 ? (
                <Button onClick={() => setSkip(skip - PAGE)}>Более новые</Button>
              ) : (null)}
              {total > 0 & skip + PAGE < total ? (
                <Button onClick={() => setSkip(skip + PAGE)}>Более старые</Button>
              ) : (null)}
            </Box>
          </Toolbar>
      </AppBar>
      {sites !== undefined ? (
        <Box p={5}>
          {messages !== undefined ? (messages.map((message, idx) => (<Message
              key={idx}
              message={message}
              site_name={currentSite !== undefined ? currentSite.name : sites.filter(site => parseInt(site.id) === parseInt(message.site_id)).shift().name}
            />)
          )) : (null)}
        </Box>
      ): (null)}
    </div>
  );
}

export default App;
