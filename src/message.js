import {Box, Container, Tooltip, Typography} from "@mui/material";
import ErrorIcon from '@mui/icons-material/Error';
import parse from 'html-react-parser';
import React from 'react';

const API_ROOT = 'http://localhost:8000'

function MediaWrapper(props: React.PropsWithChildren) {
	if (props.path === 'broken') {
		return (<Tooltip title="Медиа объект недоступен">
			<ErrorIcon sx={{color:'red', fontSize: 40}}/>
		</Tooltip>)
	}
	const img = <img src={API_ROOT + '/content/' + props.site_id + '/' + props.path}
									 sx={{height: '100%', width: '100%', objectFit: 'contain'}}
	/>
	if (props.file !== undefined) {
		return (<Box>
			<a href={API_ROOT + '/content/' + props.site_id + '/' + props.file}>{img}</a>
		</Box>)
	} else {
		return (<Box>{img}</Box>)
	}
}

function Message(props: React.PropsWithChildren) {
	let text = props.message.text === undefined ? '' : props.message.text;
	if (props.message.highlight !== undefined) {
		props.message.highlight.forEach(highlight => {
				console.log("ta", text);
				text = text.replace(highlight.replaceAll("<em>", "").replaceAll("</em>", ""), highlight)
		})

	}

	return (
		<Box>
			<Box pb={1}>
				<Container maxWidth="xl" sx={{display:"flex"}}>
					<Typography variant="h6" color="primary">{props.site_name}</Typography>
					<Typography sx={{flexGrow:1, textAlign: 'right', color:'gray'}}>{props.message.date}</Typography>
				</Container>
			</Box>
			<Box>
				<Typography className="highlighted_text">{parse(text, (tag) => {
					if (tag.name == 'em') {
						return tag;
					} else {
						return null;
					}
				})}</Typography>
			</Box>
			
			{props.message.photo === undefined ? (null) : (
				<MediaWrapper
					site_id={props.message.site_id}
					path={props.message.photo}
				/>
			)}
			{props.message.thumbnail === undefined ? (null) : (
				<MediaWrapper
					site_id={props.message.site_id}
					path={props.message.thumbnail}
					file={props.message.file}
				/>
			)}
			{props.message.links === undefined ? (null): (
				props.message.links.map((link, idx) => (<Box key={idx}>
					<a href={link} target="_blank" rel="noreferrer">{link}</a>
				</Box>))
			)}
		</Box>
	)
}

export default Message;