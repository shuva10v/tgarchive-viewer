import {Box, Container, Typography} from "@mui/material";
import React from 'react';

const API_ROOT = 'http://localhost:8000'

function Message(props: React.PropsWithChildren) {
	return (
		<Box>
			<Box pb={1}>
				<Container maxWidth="xl" sx={{display:"flex"}}>
					<Typography variant="h6" color="primary">{props.site_name}</Typography>
					<Typography sx={{flexGrow:1, textAlign: 'right', color:'gray'}}>{props.message.date}</Typography>
				</Container>
			</Box>
			<Box>
				<Typography>{props.message.text}</Typography>
			</Box>
			
			{props.message.photo === undefined ? (null) : (
				<Box>
					<img src={API_ROOT + '/content/' + props.message.site_id + '/' + props.message.photo}
							 sx={{height: '100%', width: '100%', objectFit: 'contain'}}
					/>
				</Box>
			)}
			{props.message.thumbnail === undefined ? (null) : (
				<Box>
					<img src={API_ROOT + '/content/' + props.message.site_id + '/' + props.message.thumbnail}
							 sx={{height: '100%', width: '100%', objectFit: 'contain'}}
					/>
				</Box>
			)}
		</Box>
	)
}

export default Message;