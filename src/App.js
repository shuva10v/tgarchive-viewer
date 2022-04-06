import './App.css';
import {
  AppBar,
  Autocomplete,
  Box,
  CircularProgress,
  Container,
  Grid,
  TextField,
  Toolbar,
  Typography
} from "@mui/material";
import {useEffect, useState} from "react";
import Message from "./message";

const API_ROOT = 'http://localhost:8000'

function App() {
  const [currentSite, setCurrentSite] = useState(undefined);
  const [sites, setSites] = useState(undefined);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (sites === undefined) {
      fetch(API_ROOT + "/sites")
        .then(response => response.json())
        .then(res => setSites(res))
    }
  }, [sites])

  useEffect(() => {
    fetch(API_ROOT + '/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({site_id: currentSite?.id, sort:'date', query:'*'})
    }).then(response => response.json())
      .then(res => {
        setMessages(res);
      })
  }, [currentSite])

  return (
    <div className="App">
      <AppBar position="static" style={{ background: 'transparent'}}>
				<Container maxWidth="xl">
          <Toolbar disableGutters>
            <Box p={1}>
              {sites === undefined ? (<CircularProgress color="secondary"/>) : (
                <Autocomplete options={sites}
                              defaultValue={currentSite}
                              sx={{ width: 300 }}
                              getOptionLabel={site => site?.name}
                              onChange={(event, newValue) => {
                                if (sites.includes(newValue)) {
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
            <Box>

            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      {sites !== undefined ? (
        <Box p={5}>
          {messages !== undefined ? (messages.map((message, idx) => (<Message
              key={idx}
              message={message}
              site_name={currentSite !== undefined ? currentSite.name : sites.filter(site => site.id == message.site_id).shift().name}
            />)
          )) : (null)}
        </Box>
      ): (null)}
    </div>
  );
}

export default App;
