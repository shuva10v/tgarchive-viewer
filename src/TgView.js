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
import {useSearchParams} from "react-router-dom";
import {useAlert} from "react-alert";

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

function TgView() {
  const alert = useAlert();
  const [sites, setSites] = useState(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const inputRef = useRef();

  function updateSearchParams(action) {
    action(searchParams)
    setSearchParams(searchParams)
  }

  function currentSiteId() {
    const site_id = searchParams.get("site_id");
    return site_id ? parseInt(site_id) : undefined;
  }

  function searchQuery() {
    return searchParams.get("query") || undefined;
  }

  function sortType() {
    return searchParams.get("sort") || "date";
  }

  function skip() {
    const skip = searchParams.get("skip");
    return skip ? parseInt(skip) : 0;
  }

  function currentSite() {
    const siteId = parseInt(currentSiteId());
    return sites.filter(site => parseInt(site.id) === siteId).shift()
  }

  useEffect(() => {
    if (sites === undefined) {
      fetch(API_ROOT + "/sites")
        .then(response => response.json())
        .then(res => setSites(res))
        .catch(error => alert.show("Ошибка при выполнении запроса: " + error));
    }
  }, [sites])

  useEffect(() => {
    const request = {
      site_id: currentSiteId(),
      sort: sortType(),
      query: searchQuery() === undefined ? '*': searchQuery(),
      skip: skip()
    }
    // console.log(request)
    fetch(API_ROOT + '/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
      .then(response => response.json())
      .then(res => {
        setTotal(res.total)
        setMessages(res.messages);
      })
      .catch(error => alert.show("Ошибка при выполнении запроса: " + error));
  }, [searchParams])

  if (sites === undefined) {
    return <CircularProgress color="secondary"/>;
  }

  return (
    <div>
      <AppBar position="static" style={{ background: 'transparent'}}>
        <Toolbar>
          <Box p={1}>
            <Autocomplete options={sites}
                          defaultValue={currentSite()}
                          sx={{ width: 300 }}
                          getOptionLabel={site => site?.name}
                          onChange={(event, newValue) => {
                            if (sites.includes(newValue)) {
                              setMessages([]);
                              updateSearchParams(params => {
                                params.set('site_id', newValue.id);
                                params.delete('skip');
                              });
                            } else {
                              updateSearchParams(params => {
                                params.delete('site_id');
                                params.delete('skip');
                              })
                              setMessages([]);
                            }
                          }}
                          renderInput={(params) =>
                            <TextField {...params} label="Выбор канала"/>}/>
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
                defaultValue={searchQuery()}
                onKeyUp={(e) => {
                  if (e.keyCode === 13) {
                    updateSearchParams(params => {
                      params.delete('skip');
                      params.set('query', e.target.value);
                      params.set('sort', 'relevance');
                    })
                  }
                }}
              />
              <CloseIconWrapper onClick={() => {
                updateSearchParams(params => {
                  params.delete('skip');
                  params.delete('query');
                  params.set('sort', 'date');
                })
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
                          value={sortType()}
                          onChange={(e) => updateSearchParams(params => params.set('sort', e.target.value))}
              >
                <FormControlLabel value="date" disabled={total === 0} control={<Radio />} label="В хронологическом порядке" />
                <FormControlLabel value="relevance" control={<Radio />} label="Наиболее релевантные" disabled={searchQuery() === undefined || total === 0}/>
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
            {skip() > 0 ? (
              <Button onClick={() => updateSearchParams(params => params.set('skip', skip() - PAGE))}>Более новые</Button>
            ) : (null)}
            {total > 0 & skip() + PAGE < total ? (
              <Button onClick={() => updateSearchParams(params => params.set('skip', skip() + PAGE))}>Более старые</Button>
            ) : (null)}
          </Box>

        </Toolbar>
      </AppBar>

      <Box p={5}>
        {messages !== undefined ? (messages.map((message, idx) => (<Message
            key={idx}
            message={message}
            site_name={currentSite() !== undefined ? currentSite().name : sites.filter(site => parseInt(site.id) === parseInt(message.site_id)).shift()?.name}
          />)
        )) : (null)}
      </Box>
    </div>
  );
}

export default TgView;
